'use strict';

const AWS = require('aws-sdk');
const paymentHighway = require('paymenthighway');
const SecureSigner = paymentHighway.SecureSigner;
const PaymentApi = paymentHighway.PaymentAPI;

const DynamoDb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.add = async (event) => {

  const account = process.env.ACCOUNT;
  const merchantId = process.env.MERCHANT_ID;
  const testKey = process.env.KEY;
  const testSecret = process.env.SECRET;
  const serviceUrl = process.env.SERVICE_URL;

  const secureSigner = new SecureSigner(testKey, testSecret);
  const paymentApi = new PaymentApi(serviceUrl, testKey, testSecret, account, merchantId);


  if (secureSigner.validateFormRedirect(event.queryStringParameters)) {
    console.log("start tokenization");
    return paymentApi.tokenization(event.queryStringParameters['sph-tokenization-id'])
      .then(tokenizationResponse => {

        console.log("tokenization successful");
        console.log(tokenizationResponse);
        const params = {
          TableName: process.env.CARDS_TABLE,
          Item: {
            user: event.queryStringParameters.user,
            card_token: tokenizationResponse.card_token,
            card: tokenizationResponse.card
          }
        };

        console.log("add to database");
        console.log(params);

        return DynamoDb.put(params).promise();
      })
      .then(() => {
        console.log("success");
        return Promise.resolve({statusCode: 200, body: ''});
      })
      .catch((err) => {
        console.log("error");
        console.log(err);
        return Promise.reject(err);
      });

  } else {
    console.log("validation failed");
    return Promise.reject({statusCode: 400, body: 'Signature validation failed'});
  }

};
