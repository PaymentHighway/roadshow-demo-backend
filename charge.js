'use strict';

const AWS = require('aws-sdk');
const paymentHighway = require('paymenthighway');
const PaymentApi = paymentHighway.PaymentAPI;
const SecureSigner = paymentHighway.SecureSigner;
const moment = require('moment');

const account = process.env.ACCOUNT;
const merchantId = process.env.MERCHANT_ID;
const testKey = process.env.KEY;
const testSecret = process.env.SECRET;
const serviceUrl = process.env.SERVICE_URL;

const paymentApi = new PaymentApi(serviceUrl, testKey, testSecret, account, merchantId);
const secureSigner = new SecureSigner(testKey, testSecret);
const DynamoDb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.charge = async (event) => {

  const user = event.queryStringParameters.user;
  const currency = 'EUR';

  const webhookSuccessUrl = (process.env.URL + 'charge/webhook?user=' + user).trim();
  const webhookFailureUrl = (process.env.URL + 'charge/webhook?user=' + user).trim();
  const webhookCancelUrl = (process.env.URL + 'charge/webhook?user=' + user).trim();


  return paymentApi.initTransaction()
    .then(transactionResponse => {
      const transactionId = transactionResponse.id;

      const returnUrls = paymentHighway.ReturnUrls.Builder(
        event.queryStringParameters.successUrl,
        event.queryStringParameters.cancelUrl,
        event.queryStringParameters.failureUrl
      ).setWebhookSuccessUrl(webhookSuccessUrl)
        .setWebhookFailureUrl(webhookFailureUrl)
        .setWebhookCancelUrl(webhookCancelUrl)
        .build();

      const strongCustomerAuthentication = paymentHighway.StrongCustomerAuthentication.Builder(returnUrls).build();

      const chargeCitRequest = paymentHighway.ChargeCitRequest.Builder(
        event.queryStringParameters.amount,
        currency,
        event.queryStringParameters.order,
        strongCustomerAuthentication
      )
        .setToken(new paymentHighway.Token(event.queryStringParameters.token))
        .build();


      return paymentApi.chargeCustomerInitiatedTransaction(transactionId, chargeCitRequest)
        .then(debitResponse => {
          if (debitResponse.result.code === 400) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                response_code: debitResponse.result.code,
                three_d_secure_url: debitResponse.three_d_secure_url
              })
            }
          } else if (debitResponse.result.code !== 100) {
            throw 'Wrong result code: ' + debitResponse.result.code + ' message: ' + debitResponse.result.message;
          }
          return commitPayment(transactionId, amount, currency, user)
            .then(() => {
              return {statusCode: 200, body: JSON.stringify({response_code: debitResponse.result.code})}
            })
        })
        .catch(error => {
          return {statusCode: 500, body: error}
        });
    });
};

module.exports.commitScaPayment = async (event) => {
  if (secureSigner.validateFormRedirect(event.queryStringParameters)) {
    // Match the transaction by order id and handle user authentication
    // This is just a dummy sample
    return commitPayment(
      event.queryStringParameters["sph-transaction-id"],
      event.queryStringParameters["sph-amount"],
      event.queryStringParameters["sph-currency"],
      event.queryStringParameters["user"]
    )
      .then(() => {
        return {statusCode: 200, body: ""}
      });
  } else {
    console.log("Signature validation failed");
    return {statusCode: 200, body: ""}
  }
};

function commitPayment(transactionId, amount, currency, user) {
  return paymentApi.commitTransaction(transactionId, new paymentHighway.CommitTransactionRequest(amount, currency))
    .then(transactionResultResponse => {
      const params = {
        TableName: process.env.TRANSACTIONS_TABLE,
        Item: {
          user: user,
          transaction_id: transactionId,
          committed: transactionResultResponse.committed,
          committed_amount: transactionResultResponse.committed_amount,
          card_token: transactionResultResponse.card_token,
          recurring: transactionResultResponse.recurring,
          filing_code: transactionResultResponse.filing_code,
          cardholder_authentication: transactionResultResponse.cardholder_authentication,
          card: transactionResultResponse.card,
          date: moment().toISOString(),
        }
      };

      return DynamoDb.put(params).promise();
    })
}