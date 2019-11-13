'use strict';

const paymentHighway = require('paymenthighway');
const FormBuilder = paymentHighway.FormBuilder;

module.exports.add = async (event) => {

  const account = process.env.ACCOUNT;
  const merchantId = process.env.MERCHANT_ID;
  const testKey = process.env.KEY;
  const testSecret = process.env.SECRET;
  const baseUrl = process.env.SERVICE_URL;
  const language = "EN";

  logJson(event.queryStringParameters);

  const user = event.queryStringParameters.user;
  const successUrl = event.queryStringParameters.success;
  const failureUrl = event.queryStringParameters.failure;
  const cancelUrl = event.queryStringParameters.cancel;

  const webhookSuccessUrl = (process.env.URL + 'card/add?user=' + user).trim();
  const webhookFailureUrl = (process.env.URL + 'card/add?user=' + user).trim();
  const webhookCancelUrl = (process.env.URL + 'card/add?user=' + user).trim();

  log(user, successUrl, failureUrl, cancelUrl, webhookSuccessUrl, webhookFailureUrl, webhookCancelUrl);

  const formBuilder = new FormBuilder('GET', testKey, testSecret, account, merchantId, baseUrl);

  const formContainer = formBuilder.generateAddCardParameters(
    successUrl,
    failureUrl,
    cancelUrl,
    language,
    false,
    undefined,
    undefined,
    undefined,
    undefined,
    webhookSuccessUrl,
    webhookFailureUrl,
    webhookCancelUrl
  );

  const parameters = formContainer.nameValuePairs;

  logJson(parameters);
  log(parameters.find(parameter => parameter.first === 'sph-request-id' ));

  const url = formContainer.getAction() + "?" + parametersToQueryString(parameters);

  return { statusCode: 200, body: JSON.stringify({url: url}) };
};

function parametersToQueryString(parameters) {
  return parameters.map(x => {
    return x.first + "=" + x.second;
  }).join("&");
}

function log(...args) {
  args.forEach((arg) => {
    console.log(arg);
  });
}

function logJson(...args) {
  args.forEach((arg) => {
    console.log(JSON.stringify(arg));
  });
}