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

const express = require('express')
const bodyParser = require('body-parser');
const completion = require('./completion.js');

const port = process.env.PORT || 8080;

// Initial question in the survey
// When integrated in Qualtrics, this will be replaced by user-specified question
const Q0 = "What, if anything, do you dislike most about Google Maps?";


// Conversation will stop after number_exchanges
const number_exchanges = 2;


const app = express()

// Use the body-parser middleware
app.use(bodyParser.urlencoded({
    extended: true
}));

// Makes the public subfolder readable
app.use('/public', express.static('public'));

app.all('/', async (req, res) => {

    // Did we fail a spam test?
    // Will bet set to false if receiving a text completion result
    nospam = true;

    // Generate the list of names of the textareas
    const questionnames = [];
    const responsenames = [];
    for (let i = 0; i < number_exchanges; i++) {
        questionnames.push(`CSquestion${i}`);
        responsenames.push(`CSresponse${i}`);
    }

    if (req.method === 'GET') {
        // Q0 will be replaced via javascript but needs to exist in array
        questions = [Q0]
        responses = []
    }

    if (req.body.hasOwnProperty('response')) {
        questions = []
        responses = []
        console.log(req.body)
        // Store previous questions and responses in respective arrays
        for (let i = 0; i < 3; i++) {
            if (req.body.hasOwnProperty(questionnames[i])) {
                if (req.body[questionnames[i]] != "") {
                    questions.push(req.body[questionnames[i]].trim());
                }
            }

            if (req.body.hasOwnProperty(responsenames[i])) {
                if (req.body[responsenames[i]] != "") {
                    responses.push(req.body[responsenames[i]].trim());
                }
            }
        }

        // Store new response
        responses.push(req.body.response.trim())


        if (questions.length < number_exchanges) {
            // Request open-ended question            
            output = await completion.completeText(questions, responses)

            // Need to handle the case where there is no generated completion
            if (output != false) {
                questions.push(output)
                nospam = true;
            } else {
                // This will end the conversation
                nospam = false;
            }

        }
        console.log('questions: ' + questions)
        console.log('responses: ' + responses)
    }

    html_start = `<!doctype html><html>
    <link rel= "stylesheet" type= "text/css" href= "/public/main.css">
    <body><form id= "CSchatForm" action="/"  onsubmit="chatsubmit()" method="post"><table>`

    html_mid = ''
    html_thankyou = ""
    html_endform = '</form>'
    html_end = "</body></html>"

    
    
    // Replay each (question + response) from previous exchanges
    console.log("Replay")
    for (let i = 0; i < responses.length; i++) {
        console.log("Question#: " + i + " " + questionnames[i] + " " + questions[i])

        // Question paragraph
        html_mid += `<tr>
            <td> 
                <img class="botimg">
            </td>
            <td>
                <textarea readonly class="previousQtextarea" id = "`
        html_mid += questionnames[i]
        html_mid += '" name="'
        html_mid += questionnames[i]
        html_mid += '">'
        html_mid += questions[i]
        html_mid += '</textarea></td><td></td></tr>'

        console.log("Response#: " + i + " " + responsenames[i] + " " + responses[i])
        // Response paragraph
        html_mid += `<tr>
                        <td></td> 
                        <td >
                            <textarea readonly class="previousRtextarea"  name="`
        html_mid += responsenames[i]
        html_mid += '" id = "'
        html_mid += responsenames[i]
        html_mid += '"> '
        html_mid += responses[i]
        html_mid += '</textarea></td><td></td></tr>'

    }

    // Display currently unanswered question + chatbox
    if (responses.length < number_exchanges && nospam) {
        i = questions.length - 1

        // Question paragraph
        html_mid += `<tr>
            <td> 
                <img class = "botimg">
            </td>
            <td>
                <textarea readonly class="currentQtextarea" id = "`
        html_mid += questionnames[i]
        html_mid += `" name="`
        html_mid += questionnames[i]
        html_mid += `">`
        html_mid += questions[i]
        html_mid += '</textarea></td><td></td></tr>'

        // Chat box

        html_mid += `<tr>
        <td> </td>
        <td> 
            <textarea id="CSchatbox" name="response" class="currentRtextarea" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Type your response here"></textarea>
        </td>
        <td> 
            <button type = "submit" id="CSchatButton" name = "chatButton" disabled class="replybutton"><img class="replyimg">  </button> 
        </td> 
    </tr> 
     
     <tr id = "lastquestionrow" style="visibility:hidden">
        <td> 
            <img class="botimg">
        </td>
        <td>
            <div class="thinkingdiv">
                <img class="bubblesimg">
            </div> 
        </td> 
        <td> </td> 
      </tr>
      </table>`

    } else {

        html_thankyou += `<tr>
            <td> 
                <img class="botimg">
            </td>
            <td>
                <textarea readonly class="currentQtextarea">`


        html_thankyou += "I've got all the info I need. Thank you for this conversation!"

        html_thankyou += `</textarea>
            
            </td> 
            <td> </td> 
            </tr>
            </table>`
        // Add a fake "Next" button
        // Sends the conversation back to the parent window at the end of the conversation
        // Required to save the conversation as embedded data in Qualtrics

        message = '{questions:' + JSON.stringify(questions) + ',responses:' + JSON.stringify(responses) + '}'
        html_thankyou += `
      <script> 
        function hclick(){
            window.parent.postMessage(` + message + `, '*')
        }
      </script>`

        html_thankyou += `</br> <button class="nextbutton" onclick ="hclick();">→</button> `
    }


    // First time, inform parrent we're ready to receive messages
    // When we receive message, use it as our first question
    if (req.method === 'GET') {
        html_messages = `<script> 
        window.parent.postMessage("conversationready", "*");
        window.addEventListener('message', function(event) {
            console.log("Message received from the parent: " + event.data) // Message received from parent
            if(event.data != "conversationready"){

            document.getElementById("`

        html_messages += questionnames[0]
        html_messages += `").value = event.data; 
        }
        });
        </script> `

        html_end += html_messages
    }


    // Prevents clicking when chatbox is empty
    // Automatically scroll down to show chat box
    // Toggles visibility of "thinking" box on/off
    if (responses.length < number_exchanges) {
        html_end += ` <script> 
                document.getElementById('CSchatbox').addEventListener('keyup', e => {
            //Check for the input's value
            if (e.target.value == "") {
                document.getElementById('CSchatButton').disabled = true;
            }
            else {
                document.getElementById('CSchatButton').disabled = false;
            }

            if (e.key === 'Enter') {
                document.getElementById('CSchatbox').readOnly = true;
                document.getElementById('CSchatButton').disabled  = true;
                document.getElementById('lastquestionrow').style.visibility = "visible";
                document.getElementById('CSchatForm').submit();
                console.log("enter");
            }
            });

            function chatsubmit(){
                document.getElementById('CSchatButton').disabled  = true;
                document.getElementById('lastquestionrow').style.visibility = "visible";
                return true;        
            }

            </script> `
    }

    html_end += "<script> document.getElementById('CSchatButton').scrollIntoView(); </script>"
    html = html_start + html_mid + html_endform + html_thankyou + html_end
    res.send(html);

})

app.listen(port, () => {
    console.log(`Chatty Surveys listening on port ${port}`)
})