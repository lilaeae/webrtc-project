# space Conductor
a webRTC-based interactive experience where a smartphone controls a starfield on a laptop.


## development

### week 1: foundation
* **goal:** establish a connection between two devices.
* **progress:** * set up Node.js server with express and socket.io.
    * implemented QR code generation using local IP through my wifi.
    * paired phone and laptop via room ids.

### week 2: webRTC & data channels
* **Goal:** from WebSockets to direct WebRTC data transfer.
* **progress:** * set up Node.js server with express and socket.io.
    * continued working on the signaling server and continued this on a branch for the feature webrtc 
    * for the webRTC there was an issue where the signaling offer is received but answer is not sending, so this was what took most time fixing because the server handler did not call and i had to switch io.to(roomID).emit() to socket.io... , this caused each peer to receive its own messages back which apparently shouldn't be the case
    * to test out the phone to laptop tracking i added some star visuals that appear when the user drags their finger over the screen


### week 3: visuals
* **Goal:** The plan for week three is to workout the creative experience part, i want to test out creating a slider that would allow to change color for the stars & additional ways to let the user "build" the space starfield to their own liking

### how i used ai
Week 1: I used Gemini to help structure the project architecture when i missed details or left out a line, usually a typo would occur or something of the sort which i would overlook

Week 2: For the signaling problem after a lot of trial and error in finding the issue i was able to pinpoint what went wrong with Claude and further used it to mainly clean up/structure my code as most of it was crammed in one huge script tag.


### reflection
The AI helped me understand the "signaling" concept which was confusing at first when i had to go through the walkthrough once again.