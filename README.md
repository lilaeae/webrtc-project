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
* **Goal:** The plan for week three is to workout the creative experience part, i want to test out creating a slider that would allow to change color for the stars & 
additional ways to let the user "build" the space starfield to their own liking

* **progress:** * encountered and bypassed mobile browser restrictions on gyroscopes by implementing a self-signed HTTPS server and an explicit "Permission Request" flow.

    * created a Canvas-based star class supporting physics propertie like mass &velocity
    * implemented a tools bar on the phone allowing for real-time color shifts & shape selection, and size choices to pick from with different velocity depending on its size
    * added a black hole to the space with a gravitational pull that scales based on proximity and star mass
    * added a scoring system (unfinished)


### week 4: adapting
* **Goal:** receive consult and see what is lacking, and work this out first. Workout a level system and perhaps elevate the black hole interactivity? adding different stages or an increasing black hole..

### how i used ai
Week 1: I used Gemini to help structure the project architecture when i missed details or left out a line, usually a typo would occur or something of the sort which i would overlook

Week 2: For the signaling problem after a lot of trial and error in finding the issue i was able to pinpoint what went wrong with Claude and further used it to mainly clean up/structure my code as most of it was crammed in one huge script tag.

Week 3: The AI was instrumental in debugging complex JavaScript scope issues (ReferenceErrors) and resolving Git merge conflicts during major file refactors, i had accidentally made a mistake in my merging when i wanted to branch out and i used copilot to guide me into safely making sure i don't mess up my files or make an irreversible mistake. 

some prompts used:

"let's work on differnt star types, like heavy ones that move slower"
"im currently on feature-galaxy-physics and i see that i suddenly have a controller html and index html and a receiver html, my files got spread across wrong branches i think how do i fix this safely"
"how do i change the peer on data in caller js here? I mistyped and can't find the issue"

### reflection
The AI helped me understand the "signaling" concept which was confusing at first when i had to go through the walkthrough once again.

