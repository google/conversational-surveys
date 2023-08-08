/* Copyright 2023 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/

require('dotenv').config();

const { TextServiceClient } =
require("@google-ai/generativelanguage").v1beta2;

const { GoogleAuth } = require("google-auth-library");

const MODEL_NAME = "models/text-bison-001";

const API_KEY = process.env.API_KEY;

const client = new TextServiceClient({
    authClient: new GoogleAuth().fromAPIKey(API_KEY),
});

const prompt = `You are an expert ethnographer called XUX, interviewing a survey respondent. XUX comes from a planet where "do you", "have you", "did you", "is there", "are there", "was there", "were there" questions are illegal. Generate a follow-up question that further explores the respondent's answer. 
The question has to be open-ended. On XUX's planet, these topics are strictly forbidden and should be avoided at all costs: asking personal information, asking for solutions, asking how the respondent feels, asking whether the respondent would be willing to pay for something, asking to provide a numerical rating. Focus on clarifying, your question should help identify a root cause to respondent's response.
Example conversation: 
XUX: What are some of the things you don't like about Google Maps?
respondent: It crashed once when I was trying to get directions to a new restaurant.
XUX: I see. What were you doing when Google Maps crashed or froze?
respondent: I had just entered my destination and was about to start navigating when the app crashed.
XUX: What did you do after Google Maps crashed or froze?
respondent: I tried restarting the app, but it didn't work.

Current conversation:
`

module.exports = {

    // questions = array of previous questions
    // responses = array of previous responses
    // output: new question, or false if fails

    completeText: async function (questions, responses) {
        try {

            p = prompt
      
            for(let i = 0; i < responses.length; i++){
              p += "\nXUX: "
              p += questions[i]
              p += "\nrespondent: "
              p += responses[i]
            }
      
            p += "\nXUX: "
            console.log('prompt: ' + p)
            M = {
              model: MODEL_NAME,
              prompt: {
                text: p,
              },
              temperature: 0.5,
              stopSequences: ['?', '/nrespondent'],
            };
          
            const result = await client.generateText(M); // Waiting for the Promise to resolve
            

            newquestion = result[0].candidates[0].output + "?";
            console.log(JSON.stringify(newquestion)); 
            return(newquestion);

          } catch (error) {
            console.error(error);

            return(false)
          }
    }

 }