const { SQS } = require('aws-sdk')

const sqs = new SQS();

module.exports.sendMessage = async ({ url, payload }) => {
  let statusCode = 200,
    message;
  const params = {
    QueueUrl: url,
    MessageBody: payload,
    MessageAttributes: {
      AttributeName: {
        StringValue: "Attribute Value",
        DataType: "String",
      },
    },
  };

  // console.log("PARAMS: " + JSON.stringify(params));
  // console.log('Message Body: ' + b);

  try {
    await sqs.sendMessage(params).promise();
    message = "Sent to Journal Queue!";
  } catch (error) {
    // console.log("error SQS SEND: " + JSON.stringify(error));
    message = error;
    statusCode = 500;
  }

  return {
    statusCode,
    body: JSON.stringify({
      message,
    }),
  };
}
