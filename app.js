const express = require('express')
const axios = require('axios')
const redis = require('redis')
const responseTime = require('response-time')
const { promisify } = require('util')

var AWS = require("aws-sdk");
let awsConfig = {
    "region": "us-east-2",
    "endpoint": "http://dynamodb.us-east-2.amazonaws.com",
    "accessKeyId": "AKIAW4BM7LWA4PJR5ROH", "secretAccessKey": "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"
};
AWS.config.update(awsConfig);


const app = express()
app.use(responseTime())

const client = redis.createClient({
  host: '127.0.0.1',
  port: 6379,
})
const GET_ASYNC = promisify(client.get).bind(client)
const SET_ASYNC = promisify(client.set).bind(client)

app.get('/rockets', async (req, res, next) => {
  try {
    const reply = await GET_ASYNC('rockets')
    if (reply) {
      console.log('using cached data')
      res.send(JSON.parse(reply))
      return
    }
    const respone = await axios.get('https://api.spacexdata.com/v3/rockets')
    const saveResult = await SET_ASYNC(
      'rockets',
      JSON.stringify(respone.data),
      'EX',
      10
    )
    console.log('new data cached', saveResult)
    res.send(respone.data)


    let docClient = new AWS.DynamoDB.DocumentClient();

//let save = function () {
   // console.log(respone.data[0])
    for (const element of respone.data) {
    var input = element;
    var params = {
        TableName: "rocketatDynamo",
        Item:  input
    };
    docClient.put(params, function (err, data) {

        if (err) {
            console.log("users::save::error - " + JSON.stringify(err, null, 2));                      
        } else {
            console.log("users::save::write through success" );                      
        }
    });
    }
//}

//save();
   
  } catch (error) {
    res.send(error.message)
  }
})

app.get('/rockets/:rocket_id', async (req, res, next) => {
  try {
    const { rocket_id } = req.params
    const reply = await GET_ASYNC(rocket_id)
    if (reply) {
      console.log('using cached data')
      res.send(JSON.parse(reply))
      return
    }
    const respone = await axios.get(
      `https://api.spacexdata.com/v3/rockets/${rocket_id}`
    )
    const saveResult = await SET_ASYNC(
      rocket_id,
      JSON.stringify(respone.data),
      'EX',
      10
    )    
    res.send(respone.data)
  } catch (error) {
    res.send(error.message)
  }
})

app.listen(3000, () => console.log('🚀 on port 3000'))
