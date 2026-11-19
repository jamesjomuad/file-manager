/*
    Append this script in story.html
    <script src="xapi-statement.js"></script>
    <script type="module">
        import { faker } from 'https://esm.sh/@faker-js/faker';

        // Set config
        statements.config({
            endPoint: "{{config('trax.endpoint')}}/std",
            username: "{{config('trax.username')}}",
            password: "{{config('trax.password')}}",
            domain: "{{config('app.url')}}",
            courseSlug: "{{$module->short}}",
            actor: {
                name: "{{ $user->fullname }}",
                email: "{{ $user->email }}"
            },
            totalSlides: 156,       // Set the total for progress, to get the total, test the story with the console open and finish the slides
            userId: {{ auth()->user()->id }},
            courseId: {{ $module->id }}
        })

        // Trigger Event
        window.document.dispatchEvent(
            new CustomEvent('actor.ready', {
                detail: {
                    actor: 'Actor Ready: {{ $user->fullname }} - {{ $user->email }}',
                    courseTitle: "Rmit Investigate Auditing"
                },
            })
        );
    </script>
*/

function toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2') // Insert hyphen between lowercase and uppercase letters
      .replace(/\s+/g, '-')                // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-]/g, '')       // Remove any non-alphanumeric characters (excluding hyphens)
      .toLowerCase();                      // Convert the entire string to lowercase
}

function loadScript(url, callback) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Attach handlers for all browsers
    script.onload = script.onreadystatechange = function() {
        if (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete') {
            callback();
            // Handle memory leak in IE
            script.onload = script.onreadystatechange = null;
        }
    };

    // Append the script element to the head
    document.getElementsByTagName('head')[0].appendChild(script);
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

loadScript('https://unpkg.com/@xapi/xapi@2.2.7/dist/XAPI.umd.js', function() {
    // // xapi.ready Event
    // const xapiReady = new CustomEvent('xapi.ready', {
    //     detail: {
    //         message: '"https://unpkg.com/@xapi/xapi@2.2.7/dist/XAPI.umd.js" loaded!'
    //     }
    // });
    // // Trigger xapi ready
    // window.document.dispatchEvent(xapiReady);
});


const statements = {
    // Handle progress
    slide:{
        current: 0,
        percent: null,
        total: 100,     // Must set the total
    },
    items: [],
    _config: {},
    _verbs: {
        initialized: 'http://adlnet.gov/expapi/verbs/initialized',
        terminated: 'http://adlnet.gov/expapi/verbs/terminated',
        attempted: 'http://adlnet.gov/expapi/verbs/attempted',
        completed: 'http://adlnet.gov/expapi/verbs/completed',
        passed: 'http://adlnet.gov/expapi/verbs/passed',
        failed: 'http://adlnet.gov/expapi/verbs/failed',
        answered: 'http://adlnet.gov/expapi/verbs/answered',
        interacted: 'http://adlnet.gov/expapi/verbs/interacted',
        experienced: 'http://adlnet.gov/expapi/verbs/experienced',
        read: 'http://activitystrea.ms/schema/1.0/read',
        watched: 'http://activitystrea.ms/schema/1.0/watched',
        shared: 'http://activitystrea.ms/schema/1.0/shared',
        registered: 'http://activitystrea.ms/schema/1.0/registered',
        commented: 'http://activitystrea.ms/schema/1.0/commented',
        progressed: 'http://activitystrea.ms/schema/1.0/progressed',
    }
}

statements.config = function(obj){
    this._config.endPoint = obj.endPoint
    this._config.username = obj.username
    this._config.password = obj.password
    this._config.domain   = obj.domain
    this._config.objectId = obj.domain+'/course/'+obj.courseSlug
    this._config.actor    = obj.actor
    this._config.userId   = obj.userId
    this._config.courseId = obj.courseId
    this.slide.total      = obj.totalSlides
    return this
}

statements.add = function(verb, definitionName, result, category){
    let self = this
    let domain = self._config.domain

    let statement = {
        "actor": {
            "objectType": "Agent",
            "name": self._config.actor.name,
            "mbox": "mailto:" + self._config.actor.email
        },
        "verb": {
            "id": self._verbs[verb],
            "display": {
                "en-US": verb
            }
        },
        "object": {
            "id": self._config.objectId,
            "definition": {
                "name": {
                    "en-US": definitionName
                }
            },
            "objectType": "Activity"
        }
    }

    // Only if result is defined
    if( result ){
        statement.result = result
    }

    // Custom field: scope
    if( category ){
        statement.context = {
            "contextActivities": {
                "category": [
                    {
                        "objectType": "Activity",
                        "id": `${domain}/category/` + toKebabCase(category),
                        "definition": {
                            "name": {
                                "en-US": category
                            }
                        }
                    }
                ]
            }
        }
    }

    this.items[definitionName] = (statement)

    // Set Progress percent
    self.slide.current++
    self.slide.percent = Math.floor((self.slide.current / self.slide.total) * 100)

    statements.onAdd(self.slide)

    return this
}

statements.send = function(verb, definitionName, result, category){
    // Create LRS connection
    const xapi = new XAPI({
        endpoint: this._config.endPoint,
        auth: XAPI.toBasicAuth(this._config.username, this._config.password )
    });

    if( verb ){
        this.add(verb, definitionName, result, category)
    }

    let items = this.items

    this.items = [] // Clear items

    // Send your statement
    return xapi.sendStatement({ statement: Object.values(items) });
}

statements.setProgress = async function() {
    const xHeaders = new Headers();
    xHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "userId": statements._config.userId,
        "courseId": statements._config.courseId,
        "progress": statements.slide.percent
    });

    const requestOptions = {
        method: "POST",
        headers: xHeaders,
        body: raw,
        redirect: "follow"
    };

    fetch("/api/course/progress", requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(JSON.parse(result)))
        .catch((error) => console.error(error))
    ;
}

// Dispatch event: statements.add
statements.onAdd = debounce((data) => {
    statements.setProgress()
    // Trigger event
    window.document.dispatchEvent(
        new CustomEvent('statements.add', {
            detail: data
        })
    );
}, 500);


document.addEventListener("actor.ready", function(e) {
    let data = e.detail
    console.log(data.actor);

    // Course is launched or visited
    statements.send( "initialized", data.courseTitle )
});

// Send course progress
// document.addEventListener("statements.add", function(e) {
//     let data = e.detail
//     console.log(data);
// });
