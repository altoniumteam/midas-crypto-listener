const { Lambda } = require('aws-sdk');
let lambda = new Lambda();

const invoke = async ( payload ) => {
  console.log(payload);
  const FunctionName = `midasWalletService2-dev-updateBalance`;
  console.log(`invoking function name: ${FunctionName}`);
  const params = {
    FunctionName,
    Payload: JSON.stringify(payload)
  };

  try {
    const invokeLambda = await lambda.invoke(params).promise();

    console.log(`${FunctionName} has successfully invoked`, invokeLambda);

    return invokeLambda;
  } catch (error) {
    return error;
  }
};

module.exports = {
    invoke
}