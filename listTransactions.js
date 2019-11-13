'use strict';

const AWS = require('aws-sdk');

const DynamoDb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

module.exports.list = async (event) => {

  const user = (event.queryStringParameters.user !== undefined) ? event.queryStringParameters.user : "";

  const params = {
    TableName: process.env.TRANSACTIONS_TABLE,
    KeyConditionExpression: "#user = :user",
    ExpressionAttributeNames: {
      "#user": "user"
    },
    ExpressionAttributeValues: {
      ":user": user
    }
  };

  return DynamoDb.query(params).promise()
    .then(data => {
      console.log(data);
      return {statusCode: 200, body: JSON.stringify(data.Items)};
    })
    .catch(err => {
      console.log(err);
      return {statusCode: 400, body: err};
    });
};
