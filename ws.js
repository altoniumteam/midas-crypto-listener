const AWS = require("aws-sdk");

module.exports.sendWebsocketMessage = async (wsConnectionId, wsMessage) => {
  const awsApiId = "fkg31ugcdl";
  const awsStage = "dev";
  const regionCode = process.env.AWS_REGION;

  try {
    const apigatewayManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint:
        awsApiId + ".execute-api." + regionCode + ".amazonaws.com/" + awsStage,
    });
    const params = {
      ConnectionId: wsConnectionId,
      Data: wsMessage,
    };
    console.log(params);
    await apigatewayManagementApi.postToConnection(params).promise();
  } catch (err) {
    console.log(err);
    return { statusCode: 200, body: "Message cannot delivered" };
  }
  return { statusCode: 200, body: "Message delivery OK" };
}