const handleResponse = (result, errorCode = 0, e) => {
  let statusCode = 200;
  let body = {};
  if(result){
    if(typeof(result) === 'object'){
      if(Array.isArray(result)){
        body.result = result
      }else{
        body = result;
      }
    }else{
      body = {result}
    }
  }
  body.error = errorCode;
  if(e && errorCode!==0){
    if(Array.isArray(e) || typeof e == 'string'){
      body.message = e;
    }else if(typeof e == 'object'){
      body.message = String(e);
    }
    statusCode = 400;
  }else{
    body.message = "Success"
  }
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
    body: JSON.stringify(body),
  };
}

module.exports = {
  handleResponse,
}