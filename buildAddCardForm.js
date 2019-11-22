'use strict';

const paymentHighway = require('paymenthighway');
const FormBuilder = paymentHighway.FormBuilder;

module.exports.build = async (event) => {

  const user = event.queryStringParameters.user;
  const webhookSuccessUrl = (process.env.URL + 'card/add?user=' + user).trim();
  const webhookFailureUrl = (process.env.URL + 'card/add?user=' + user).trim();
  const webhookCancelUrl = (process.env.URL + 'card/add?user=' + user).trim();

  const formBuilder = new FormBuilder(
    'GET',
    process.env.KEY,
    process.env.SECRET,
    process.env.ACCOUNT,
    process.env.MERCHANT_ID,
    process.env.SERVICE_URL
  );

  const formContainer = formBuilder.generateAddCardParameters(
    event.queryStringParameters.successUrl,
    event.queryStringParameters.failureUrl,
    event.queryStringParameters.cancelUrl,
    event.queryStringParameters.language,
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

  const url = formContainer.getAction() + "?" + parametersToQueryString(parameters);

  return { statusCode: 200, body: JSON.stringify({url: url}) };
};

function parametersToQueryString(parameters) {
  return parameters.map(x => {
    return x.first + "=" + x.second;
  }).join("&");
}