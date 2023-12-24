/* INIT */

function copyToClipboard() {
    var text = "~/Library/Application Support/Knowledge/knowledgeC.db";
    var button = document.querySelector('.copy-button');
    navigator.clipboard.writeText(text).then(function () {
        button.innerHTML = '<span class="material-symbols-rounded">done</span>'; // Change the button text to "done"
        console.log('Copying to clipboard was successful!');
        setTimeout(function () {
            button.innerHTML = '<span class="material-symbols-rounded">content_copy</span>'; // Change the button text back to "content_copy" after 2 seconds
        }, 2000);
    }, function (err) {
        console.error('Could not copy text: ', err);
    });
}


function closeLightbox() {
    document.getElementById('lightbox').classList.add('lightbox-hidden');
}

/* CHART AND STATS FUNCTIONS */


function transformData(rows) {
    var apps = {};
    // we need to group by app so that we can sum the usage time
    console.log("Running " + rows.length)
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var app = row[0];
        var usage = row[1];
        var startTime = row[2];
        var endTime = row[3];
        var createdAt = row[4];
        var tz = row[5];
        var deviceId = row[6];
        var deviceModel = row[7];

        if (app in apps) {
            apps[app]["usage"] += usage;
        } else {
            apps[app] = {
                "usage": usage, // in seconds
                "start_time": startTime,
                "end_time": endTime,
                "created_at": createdAt,
                "tz": tz,
                "device_id": deviceId,
                "device_model": deviceModel
            };
        }
    }
    return apps;
}

function loadSampleData() {
    // load data from "assets/knowledgeC.db". We don't need to run the query because the data is already in the correct format
    path = "assets/knowledgeC.db";
    // read this file so we can pass it to runQuery
    fetch(path).then(function (response) {
        return response.blob();
    }).then(function (blob) {
        runQuery(blob).then(transformedData => {
            createChart(transformedData);
            // set .story div to display: block
            loadStory(transformedData)
        }).catch(error => {
            console.error('An error occurred:', error);
        });
    });
}


function runQuery(file) {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        var transformed;
        reader.onload = function () {
            var uInt8Array = new Uint8Array(this.result);
            var db = new SQL.Database(uInt8Array);
            var query = `
                        SELECT
                            ZOBJECT.ZVALUESTRING AS "app", 
                            (ZOBJECT.ZENDDATE - ZOBJECT.ZSTARTDATE) AS "usage",
                            (ZOBJECT.ZSTARTDATE + 978307200) as "start_time", 
                            (ZOBJECT.ZENDDATE + 978307200) as "end_time",
                            (ZOBJECT.ZCREATIONDATE + 978307200) as "created_at", 
                            ZOBJECT.ZSECONDSFROMGMT AS "tz",
                            ZSOURCE.ZDEVICEID AS "device_id",
                            ZMODEL AS "device_model"
                        FROM
                            ZOBJECT 
                            LEFT JOIN
                            ZSTRUCTUREDMETADATA 
                            ON ZOBJECT.ZSTRUCTUREDMETADATA = ZSTRUCTUREDMETADATA.Z_PK 
                            LEFT JOIN
                            ZSOURCE 
                            ON ZOBJECT.ZSOURCE = ZSOURCE.Z_PK 
                            LEFT JOIN
                            ZSYNCPEER
                            ON ZSOURCE.ZDEVICEID = ZSYNCPEER.ZDEVICEID
                        WHERE
                            ZSTREAMNAME = "/app/usage"
                        ORDER BY
                            ZSTARTDATE DESC
                    `;
            var rows = db.exec(query);
            console.log(rows[0].values.length + " entries found in db");
            transformed = transformData(rows[0].values);
            console.log("Found " + Object.keys(transformed).length + " apps")
            resolve(transformed);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}


function secondsToHours(d) {
    d = Number(d);
    var h = d / 3600;
    return h.toFixed(2); // keep two decimal places
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

var bundleIdToAppName = {
    'com.apple.finder': 'Finder',
    'com.google.Chrome': 'Google Chrome',
    'com.apple.Safari': 'Safari',
    'com.google.ios.youtube': 'YouTube',
    'com.apple.mobilesafari': 'Safari',
    'notion.id': 'Notion',
    'com.apple.mail': 'Mail',
    'com.apple.Terminal': 'Terminal',
    'com.apple.iChat': 'Messages',
    'com.apple.iCal': 'Calendar',
    'com.apple.Music': 'Music',
    'com.apple.Maps': 'Maps',
    'com.apple.iBooks': 'Books',
    'net.whatsapp.WhatsApp': 'WhatsApp',
    'com.playstation.psremoteplay': 'PS Remote Play',
    'com.spotify.client': 'Spotify',
    'com.google.photos': 'Google Photos',
    'company.thebrowser.Browser': 'Arc',
    'com.burbn.instagram': 'Instagram',
    'io.robbie.HomeAssistant': 'Home Assistant',
    'com.plexapp.plex': 'Plex',
    'com.apple.mobilenotes': 'Notes',
    'com.apple.reminders': 'Reminders',
    'com.apple.mobileslideshow': 'Photos',
    'com.microsoft.VSCode': 'VS Code',
    // Add more mappings here...
};

function createChart(data) {
    // Filter out apps with less than 1 hour of usage and sort by usage
    data = Object.entries(data)
        .filter(([k, v]) => v.usage >= 7000)
        .sort((a, b) => b[1].usage - a[1].usage)
        .reduce((obj, [k, v]) => Object.assign(obj, { [k]: v }), {});

    var ctx = document.getElementById('totalTime-chart').getContext('2d');
    var labels = Object.keys(data).map(function (bundleId) {
        // Use the app name if available, otherwise use the bundle identifier
        return bundleIdToAppName[bundleId] || bundleId;
    });
    var datasets = labels.map(function (label, i) {
        return {
            label: label,
            data: [secondsToHours(data[Object.keys(data)[i]].usage)],
            backgroundColor: getRandomColor(),
            borderWidth: 1,
            barPercentage: Object.keys(data).length,
            categoryPercentage: Object.keys(data).length
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function (tooltipItem) {
                            return tooltipItem[0].label;
                        }
                    }
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: '#FFFFFF' // Change this to your desired color
                    },
                },
                y: {
                    ticks: {
                        color: '#FFFFFF' // Change this to your desired color
                    },
                }
            }
        }
    });
}

/* ONLOAD */
window.onload = function () {
    // alert("1. Open the Finder\n2. Command + Shift + G\n3. Paste this: djshfdjs\n4. Enter\n5. Drag \"knowledgeC.db\" onto this window");

    var dropZone = document.getElementById('drop_zone');

    dropZone.ondrop = function (e) {
        e.preventDefault();
        this.className = 'upload-drop-zone';

        var files = e.dataTransfer.files;
        for (var i = 0; i < files.length; i++) {
            if (files[i].name === "knowledgeC.db") {
                dropZone.remove(); // remove the drop zone
                var transformed = runQuery(files[i]);
                console.log("Found " + Object.keys(transformed).length + " apps")
                runQuery(files[i]).then(transformedData => {
                    createChart(transformedData);
                    // set .story div to display: block
                    loadStory(transformedData)
                }).catch(error => {
                    console.error('An error occurred:', error);
                });
            } else {
                alert("Please select a file called \"knowledgeC.db\"")
                return;
            }
        }
    }

    dropZone.ondragover = function () {
        this.className = 'upload-drop-zone drop';
        return false;
    }

    dropZone.ondragleave = function () {
        this.className = 'upload-drop-zone';
        return false;
    }

    /* STORIES */
    // Load amp stories

    function loadStory(stats) {
        stats = Object.entries(stats)
            .sort((a, b) => b[1].usage - a[1].usage)
        //.reduce((obj, [k, v]) => Object.assign(obj, { [k]: v }), {});
        // get all the placeholder elements for the stories
        // read the stats and generate the stories
        var totalHead = "Multitasking extraordinaire"
        var totalText = "You used " + stats.length + " apps in total";
        var topHead = "Your most used app was...";
        var topText = bundleIdToAppName[stats[0][0]] || stats[0][0];
        var topText2 = "And you clocked in an astounding " + secondsToHours(stats[0][1].usage) + " hours";
        var breakdownHead = "And here's a breakdown of your usage";
        var breakdownText = "A content connoisseur: You surely know your apps";

        // set the innerHTML of the placeholders to the actual stories
        document.getElementById('totalHead').innerHTML = totalHead;
        document.getElementById('totalText').innerHTML = totalText;

        document.getElementById('topHead').innerHTML = topHead;
        document.getElementById('topText').innerHTML = topText;
        document.getElementById('topText2').innerHTML = topText2;

        document.getElementById('breakdownHead').innerHTML = breakdownHead;
        document.getElementById('breakdownText').innerHTML = breakdownText;
        // show the stories

        // add "standalone" to amp-story element
        var ampStoryElement = document.querySelector('amp-story');
        var storyContainer = document.getElementById('story-container');
        var parentElement = ampStoryElement.parentElement;

        storyContainer.style.display = "block";
        parentElement.removeChild(ampStoryElement);

        // Re-add the amp-story element to the DOM
        parentElement.appendChild(ampStoryElement);
    }
}