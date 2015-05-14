
// https://195.210.28.41/cgit/wind101.git/

// http://localhost:8099/
//
// http://www.erichynds.com/examples/jquery-ui-multiselect-widget/demos/preselected.htm

Container.prototype = new Configurable();
Container.prototype.constructor = Container;

function Container(selector) {   
    this.$obj = jQuery(selector);

    this.dashboards = [];
    this.sensors = {};
    this.measures = {};    
    this.deviceList = [];

    this.feeder = null;
    
    // sensors via ws
    this.sensorReadStart = null;
    this.sensorsToRead = 0;
    
    // our map object
    this.map = null;

    // used by forms
    this.device = null;
    
    // from URL
    this.activeController = null;
    this.activeDevice = null;
    this.activeDashboard = 0;
    
    /****** assorted ******/
    this.map = null;
    this.dateRangeControl = null;
    this.flagLoadDefault = false;
    this.bootstrapSize = null;
    this.initialMove = true;
    
    this.reset();
    
    this.extendSoftSettings({
        dashboardId: 0, // currently opened dashboard id
        apiKey: '',
        customerName: '',
        language: 'en',
        timezone: 'Europe/London',
        displayDateFormat: 'YY-MM-DD HH:mm',
        maxPoints: 100,
        units: Units,
    });
    
    this.forecastIconCodeMap = {
        1: ['260', '248'],
        3: ['113'],
        6: ['119', '122'],
        10: ['296', '266', '359', '308', '302', '10'],
        11: ['353', '263', '176', '356', '305', '299', '386', '293', ],
        20: ['200', '389'],
        22: ['395', '371', '335', '338', '332', '230'],
        23: ['368', '326', '323', '179', '392', '329'],
        25: ['377', '350'],
        26: ['374'],
        28: ['365', '320', '314', '311', '284', '281'],
        29: ['362', '317', '185', '182'],
        38: ['227'],
        40: ['116'],
        42: ['143'],
    }
}

jQuery(window).resize(function() {
    if (!customer.container.initialMove) {
        customer.container.windowSizeChange();
    }
    customer.container.initialMove = false;
});

Container.prototype.windowSizeChange = function() {
    var $window = jQuery(window);
    if ($window.width() < 768 && this.bootstrapSize != 'lg') {
        this.bootstrapSize = 'lg';
        this.bootstrapSizeChange();
    }

    else if ($window.width() > 768 && $window.width() <= 975 && this.bootstrapSize != 'md') {
        this.bootstrapSize = 'md';
        this.bootstrapSizeChange();
    }

    else if ($window.width() > 975 && $window.width() <= 1182 && this.bootstrapSize != 'sm') {
        this.bootstrapSize = 'sm';
        this.bootstrapSizeChange();
    }
    else if ($window.width() > 1182 && this.bootstrapSize != 'xs') {
        this.bootstrapSize = 'xs';
        this.bootstrapSizeChange();
    }
};

Container.prototype.bootstrapSizeChange = function() {
    this.moveBoxesToPosition();
};

Container.prototype.getSoftSettings = function() {
    var dashboards = [];
    for (var i in this.dashboards) {
        var dashboard = null;
        if (this.dashboards[i] == null) {
            if (i != 0) dashboard = customer.getSettings().dashboards[i];
        } else {
            dashboard = this.dashboards[i].getSoftSettings();
        }
        dashboards.push(dashboard);
    }
    return jQuery.extend({}, this.softSettings, {dashboards: dashboards});
}

Container.prototype.getSoftSettingsWithRemove = function(index) {
    var dashboards = [];
    for (var i in this.dashboards) {
        var dashboard = null;
        //remove
        if (i == index) continue;
        if (this.dashboards[i] == null) {
            if (i != 0) dashboard = customer.getSettings().dashboards[i];
        } else {
            dashboard = this.dashboards[i].getSoftSettings();
        }
        dashboards.push(dashboard);
    }
    return jQuery.extend({}, this.softSettings, {dashboards: dashboards});
}

Container.prototype.extendSoftSettings = function(softSettings) {    
    Configurable.prototype.extendSoftSettings.apply(this, arguments);
    console.debug("[Container] Extending with soft settings:");
//    console.dir(softSettings);
    
    for (var i in this.dashboards) {
        if (this.dashboards[i]) {
            this.dashboards[i].extendSoftSettings(this.softSettings.dashboards[i]);
        }
    }
}

Container.prototype.applySettings = function() {
    console.debug("[Container] Applying settings:");
    //console.dir(this.settings);
    
    this.reset();        
    this.loadDashboard();
    return this;
}

Container.prototype.reset = function() {
    this.$obj.html('<div class="mask wind101-draggable" style="margin-left:45%; margin-top:20%;" > \
                <img src="core/img/preload.gif" alt="preloader" class="img-rounded"> \
            </div>');
    this.dashboards = [];
    this.sensors = {};
    this.feeder = null;
    
    console.debug("[Container] Reset a container:");
    //console.dir(this);
}
/**
 *  get DOMs of all elements and place it to html
 */
Container.prototype.render = function() {
    console.debug("[Container] Rendering");
    this.$obj.children().remove();
    
    for (var i in this.dashboards) {
        if (i == this.activeDashboard) {
            this.$obj.append(this.dashboards[i].getDOM());
        }
    }
    this.dispatchResize();
    
    if(this.isControllerDevice()) {
        this.dashboards[this.activeDashboard].setInitialBoxesPositions(); 
    } else if(this.activeController === 'dashboard'){
        for(var d in this.dashboards) {
            if(d == this.activeDashboard) {
                this.windowSizeChange();
                this.moveBoxesToPosition();
                //this.dashboards[d].setBoxesToPosition();
            }
        }
    }
    this.createRangeControl();
    this.dispatchResize();
    
    return this;
};

Container.prototype.dispatchResize = function() {
    var evt = document.createEvent('UIEvents');
    evt.initUIEvent('resize', true, false, window, 0);
    window.dispatchEvent(evt);
};

/**
 *  this should be run just once at the beginning, is there something to initialize?
 */

/**
 *  after login, we set customer.sessionId as uuid and ask for owned devices
 *  1 level of nesting is okay, i just want to avoid 2 and more, for code readability
 */

Container.prototype.onlogin = function() {
    // get sensor list
    var sensorRequest = new MessageDeviceListGetRequest(customer.sessionId);
    sensorRequest.done = jQuery.proxy(function(data, textStatus, jqXHR) {
        if(data.c == 5) {
            console.warn('Logging in failed');
            docCookies.removeItem('session_id');
            customer.login(customer.defaultEmail, customer.defaultPassword);
            return;
        }
        customer._initTimeZones();
        this.onDeviceList(data.ai);
    }, this);
    sensorRequest.request();
};

Container.prototype.onDeviceList = function(deviceItems) {
    //console.log("[Container] On device list:");
    //console.log(deviceItems);
    
    // sort list
    var deviceNames = [];
    for (var i in deviceItems) {
        deviceNames.push(deviceItems[i].s);
    }
    deviceNames.sort();
    this.deviceList = [];
    for (var n in deviceNames) {
        for (var i in deviceItems) {
            if (deviceItems[i].s === deviceNames[n]) {
                this.deviceList.push(deviceItems[i]);
                break;
            }
        }
    }

    // no devices in db, try look for one again
    if (deviceItems.length === 0) {
        customer.alert('<b>No stations available</b><br>Please connect one...', customer.alerts.warning, false);
        setTimeout(function() {
            customer.container.onlogin();
        }, 6000);
        return;
    }

    var activeDevices = this.getActiveDeviceCount();
    var text = (activeDevices == 0) ? 'No active stations' : ((activeDevices == 1) ? '<b>One</b> active station' : '<b>' + activeDevices + '</b> active stations');
    text += ' (total ' + deviceItems.length + ')';
    customer.alert(text, customer.alerts.success);
    
    this._createDashboardItems();
    
    if (location.href.indexOf("#") > -1) {
        
        var route = location.hash.split("#").join("");
        var parts = route.split("/");
        this.activeController = parts[0];
        
        switch(this.activeController) {
            case 'device':
                if (parts.length > 1) {
                    this.activeDevice = parts[1];
                    console.log("[Container] Controller 'device' " + this.activeDevice);
                }
                break;
            case 'dashboard':
                if (parts.length > 1) {
                    this.activeDashboard = parts[1];
                    console.log("[Container] Controller 'dashboard' " + this.activeDashboard);
                }
                break;
        }
        
    } else {
//        this.activeController = 'device';
//        this.activeDevice = this.getPreferredSerialNumber();
//        window.location.hash = 'device/' + this.activeDevice;

        this.activeController = 'map';
        window.location.hash = 'map';
    }

    // get container settings
    
    //console.log("[Container] Customer session ID " + customer.sessionId);
    var containerRequest = new MessageContainerSettingGetRequest(customer.sessionId);

    containerRequest.done = jQuery.proxy(function(data, textStatus, jqXHR) {
        if (!containerRequest.validate(data, textStatus, jqXHR)) {
            customer.alert('Error reading customer settings');
            return;
        }
        
        // change the user icon if logged in
        var icon = (data.e != customer.defaultEmail) ? 'user_on.svg' : 'user_off.svg';
        jQuery('div.navbar-collapse > ul > li.user > a > img ').attr('src', 'assets/img/' + icon);
        
        customer.email = data.e;
        customer.apiKey = data.key;
        
        // check if the dashboard exists
        if (this.activeController == 'dashboard') {
            var exists = (typeof data.cs.dashboards !== 'undefined');
            if ((exists && !data.cs.dashboards[this.activeDashboard]) || !exists) {
                this.activeController = 'device';
                this.activeDashboard = 0;
                this.activeDevice = this.getPreferredSerialNumber();
                window.location.hash = 'device/' + this.activeDevice;
            }
        }
        
        this._createDashboardItems(data.cs.dashboards);
        
        switch (this.activeController) {
            case 'device':
                this.extendSoftSettings(data.cs);
                this.loadDevice();
                break;
            case 'dashboard':
                this.extendSoftSettings(data.cs);
                this.loadDashboard();
                break;
            case 'map':
                this.loadMap();
                break;
            case 'devices':
                this.loadDeviceList();
                break;
            case 'grants':
                this.loadGrants();
                break;
        }
    }, this);
    
    containerRequest.fail = jQuery.proxy(
        function(data) {
            console.log('MessageContainerSettingGetResponse failed');
        }, this
    );
    containerRequest.request();
};

Container.prototype.loadGrants = function() {
    this.sensorReadStart = Date.now();
    this.sensorsToRead = this.deviceList.length;
    customer.socket.readAllSensors(); //callback is onAllSensors()
};

Container.prototype.onAllSensors = function() {
    var diff = Date.now() - this.sensorReadStart;
    console.log('Read ' + this.deviceList.length + ' devices in ' + diff + 'ms (' +  (this.deviceList.length/diff*1000) + ' received messages per sec)');
    
    this.sensorsToRead = 0;
    
    var boxes = [];
    for (var i in this.deviceList) {
        var s = this.deviceList[i].s;
        var sensors = [];
        var foundSensors = 0;
        for (var j in this.sensors) {
            if(this.sensors[j].deviceId === s) {
                // grant printdata only
                if(true || this.sensors[j].name === 'AMOUNT' || this.sensors[j].name === 'TITLE') {
                    sensors[this.sensors[j].id] = s;
                    foundSensors++;
                    this.sensorsToRead++;
                }
                
//                if(this.sensors[j].name !== 'AMOUNT' && this.sensors[j].name !== 'TITLE') {
//                    console.log('BOX LEN ' + boxes.length);
//                }
            }
        }
        
        if (true || foundSensors >= 2) {
            var box = new Box({sensors: sensors});
            box.extendSoftSettings({});
            boxes.push(box);
        }
    }
    
    this.feeder = new Feeder(boxes, 0, Date.now());
    
    customer.socket.sensorReadStart = Date.now();
    customer.socket.sensorsToRead = this.sensorsToRead;
    
    for (var j in this.sensors) {
        if(true || this.sensors[j].name === 'AMOUNT' || this.sensors[j].name === 'TITLE')
            customer.socket.getData(0, this.sensors[j].id, 0, Date.now(), 'AVG');
    }
};

Container.prototype.onAllData = function() {
    var diff = Date.now() - customer.socket.sensorReadStart;
    console.log('Read ' + this.sensorsToRead + ' sensor data in ' + diff + 'ms (' +  (this.sensorsToRead/diff*1000) + ' received messages per sec)');
    
    var out='';
    for (var i in this.feeder.boxes) {
        var aggregator = this.feeder.boxes[i].aggregator;
        var skipTo2ndSensor = true;
        for (var j in aggregator.sensors) {
            if (skipTo2ndSensor) {
                skipTo2ndSensor = false;
                continue;
            }
            out += aggregator.sensors[j].deviceId + ' count: ' + aggregator.count 
                    + ' sum: ' + aggregator.sums[j] + 'EUR<br/>';
        }
    }
    //this.$obj.html(out);
    
    var mapdatag = [];
    var mapdatar = [];
    var mapdatas = [];
    var printdata = {};
    
    for (var i in this.feeder.boxes) {
        var aggregator = this.feeder.boxes[i].aggregator;
        var sensorGrantAmount = null;
        var sensorGrantTitle = null;
        var sensorResidency = null;
        var sensorScholarship = null;
        for (var j in aggregator.sensors) {
            switch (aggregator.sensors[j].name) {
                case 'TITLE':
                    sensorGrantTitle = j;
                    break;
                case 'AMOUNT':
                    sensorGrantAmount = j;
                    break;
                case 'NAME':
                    sensorResidency = j;
                    break;
                default:
                    sensorScholarship = j;
            }
        }
        
        var datag = {};
        var datar = {};
        var datas = {};
        
        // find data
        for (var j in aggregator.data) {
            var m = moment.unix(j);
            var year = m.format('YYYY');
            //console.log(year);
            
            if (typeof sensorGrantTitle !== 'undefined' && typeof aggregator.data[j].fields[sensorGrantTitle] !== 'undefined') {
                if (typeof datag[year] === 'undefined') {
                    datag[year] = [];
                }
                var desc = JSON.parse(aggregator.data[j].fields[sensorGrantTitle]);
                datag[year].push({i: desc.i, a: desc.a, name: desc.t, amount: aggregator.data[j].fields[sensorGrantAmount],c: desc.c, g: Math.floor(1+Math.random()*7)});
            }
            
            if (typeof sensorResidency !== 'undefined' && typeof aggregator.data[j].fields[sensorResidency] !== 'undefined') {
                if (typeof datar[year] === 'undefined') {
                    datar[year] = [];
                }
                var desc = JSON.parse(aggregator.data[j].fields[sensorResidency]);
                datar[year].push({ci: desc.co, h: desc.h, c: desc.c, n: desc.n});
            }
            
            if (typeof sensorScholarship !== 'undefined' && typeof aggregator.data[j].fields[sensorScholarship] !== 'undefined') {
                if (typeof datas[year] === 'undefined') {
                    datas[year] = [];
                }
                var desc = JSON.parse(aggregator.data[j].fields[sensorScholarship]);
                datas[year].push(desc);
            }
           
        }
        
        // find lon/lat
//        for (var j in customer.container.deviceList) {
//            var device = customer.container.deviceList[j];
//            if (device.s === item.s) {
//                item.lon = device.lon;
//                item.lat = device.lat;
//                item.c = device.dlocation;
//                break;
//            }
//        }
        
        //jQuery.isEmptyObject(datag);
        
        var item = {};
        
        if (typeof sensorGrantTitle !== 'undefined' && typeof aggregator.sensors[sensorGrantTitle] !== 'undefined') {
            var device = this.getDevice(aggregator.sensors[sensorGrantAmount].deviceId);
            item = {
                data: datag,
                s: device.s,
                lon: device.lon,
                lat: device.lat,
                c: device.dlocation
            };
            mapdatag.push(item);
        }
        
        if (typeof sensorResidency !== 'undefined' && typeof aggregator.sensors[sensorResidency] !== 'undefined') {
            var device = this.getDevice(aggregator.sensors[sensorResidency].deviceId);
            item = {
                data: datar,
                s: device.s,
                lon: device.lon,
                lat: device.lat,
                c: device.dlocation
            };
            mapdatar.push(item);
        }
        
        if (typeof sensorScholarship !== 'undefined' && typeof aggregator.sensors[sensorScholarship] !== 'undefined') {
            var device = this.getDevice(aggregator.sensors[sensorScholarship].deviceId);
            item = {
                data: datas,
                s: device.s,
                lon: device.lon,
                lat: device.lat,
                c: device.dlocation
            };
            mapdatas.push(item);
        }
        

        
        
        
        /* print data 
        
        var data = item.data;
        
        for (var year in data) {
            if (typeof printdata[year] === 'undefined') {
                printdata[year] = {};
            }
            
            for (var idx in data[year]) {
                for (c in data[year][idx].c) {
                    var t = data[year][idx].c[c];
                    if (typeof printdata[year][t] === 'undefined') {
                        printdata[year][t] = 0;
                    }

                    printdata[year][t]++;
                }
            }
        }
        
        var str = 'year,';
        
        for (var t=1; t<=19; t++) {
            str += t + ',';
        }
        
        str += '<br>';
        
        for (var year in printdata) {
            str += year + ',';
            for (var t=1; t<=19; t++) {
                str += (typeof printdata[year][t] === 'undefined') ? '' : printdata[year][t];
                str += ',';
            }
            
            str += '<br>';
        }
        
        /* print data END */
        
        
        //this.$obj.html(JSON.stringify(item));
        //break;
        
        
    }
    
    //this.$obj.html(str);
    //return;
    
  var mapdata = [mapdatag,mapdatas,mapdatar];
  
    var filters = [{
        g: {
            1: 'Extended Standard',
            2: 'Flagship Projects',
            3: 'Small',
            4: 'Standard',
            5: 'Strategic',
            6: 'University Studies',
            7: 'Visegrad+'},
        c: {
            1: {n:'Architecture and urban development', d:'Planning, design, cities and urban areas, urban renewal'},
            2: {n:'Common identity', d:'Regional identity building, V4 branding, strengthening ties between V4 nations, fostering dialog on V4/Central Europe'},
            3: {n:'Cross-border cooperation', d:'Initiatives in border areas, bi-/trilateral initiatives'},
            4: {n:'Culture and arts', d:'Projects dealing with cultural cooperation, cultural heritage, cultural infrastructures and services, and all spheres of fine arts'},
            5: {n:'Demographic change and migration', d:'Social and spatial segregation, brain drain, aging and other demographic challenges'},
            6: {n:'Education, training and capacity building', d:'Life-long learning, knowledge transfer, know-how facilitation'},
            7: {n:'Environment and climate change', d:'Projects dealing with sustainability, natural risks, water, waste, air quality, biodiversity, energy, protection of natural heritage, challenges related to the climate change, etc.'},
            8: {n:'Institutional networking and partnerships', d:'Cooperation between public institutions, regional governments, universities and other higher-education institutions, schools, town-twinning projects, etc.'},
            9: {n:'Media, journalism, ICT', d:'Cooperation of media outlets, projects dealing with information and communication technologies and their development, digitization, projects dealing with free speech, media literacy, etc.'},
            10: {n:'Public policy', d:'Policies of public administrations – defense policy, energy policy, foreign policy, economic policy, security, infrastructure, public health, etc.'},
            11: {n:'Science and research', d:'Research activities, scientific development, scientific mobility and networking'},
            12: {n:'SMEs and entrepreneurship', d:'Start-ups, business advisory services, jobs creation, clusters, business networks, market innovation'},
            13: {n:'Social inclusion and equal opportunities', d:'Social projects dealing with disadvantaged peoples and excluded groups, namely minorities'},
            14: {n:'Sports', d:'Sporting events, cooperation between sport institutions'},
            15: {n:'Tourism', d:'Promotion of natural and cultural assets, tourist services and products'},
            16: {n:'Transparency and fight against corruption',d:'Anti-corruption mechanisms, open government initiatives, watchdog initiatives'},
            17: {n:'Youth exchanges', d:'Youth mobility, intercultural learning, contacts among schools'}
        }
    },
    
    {},
    
    {
        c: {
            1: {n:'Visual & sound arts', d:'Multimedia artists'},
            2: {n:'Literary', d:'Literary publications'},
            3: {n:'Performing arts', d:'Art performances'}
        }
    }
];
    
  
  var textFile = null,
  makeTextFile = function (text) {
    var data = new Blob([text], {type: 'text/plain'});

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (textFile !== null) {
      window.URL.revokeObjectURL(textFile);
    }

    textFile = window.URL.createObjectURL(data);

    return textFile;
  };


  var create = document.getElementById('create');

  create.addEventListener('click', function () {
    var link = document.getElementById('downloadlink');
    link.href = makeTextFile('var filters='+JSON.stringify(filters)+';\n\
var mapdata='+JSON.stringify(mapdata));
    link.style.display = 'block';
  }, false);

    
    //this.$obj.html(JSON.stringify(mapdata));

    
    
    
    
    throw 'Grants to be implemented here';
};

// called by object waiter or from socket
Container.prototype.addSensors = function(data) {
    var sensorList = data.ai;

    //process every sensor
    for (var s in sensorList) {
        var sensor = sensorList[s];
        
        //ignore logs
        if (sensor.measure === 'log') continue;

        //check whether the sensor isnt created already
        if (typeof this.sensors[sensor.id] === 'undefined') {
            this.sensors[sensor.id] = new Sensor({
                id: sensor.id,
                deviceId: data.s,
                name: sensor.name,
                measure: MeasuresById[sensor.measure],
                period: sensor.pe,
                source: sensor.source_id,
                resolution: 0,
            });
        }
    }
    
    this.sensorsToRead--;
    if (this.sensorsToRead <= 0) {
        this.onAllSensors();
    }
};

Container.prototype.loadMap = function() {
    this._hideAll();
    jQuery('#map-canvas').show();
    
	var center = new google.maps.LatLng(49.1390462, 40.2203821);
	var zoom = 3;
	for(var i=0; i<this.deviceList.length; i++){
		if(this.deviceList[i].s == this.activeDevice){
			center = new google.maps.LatLng(this.deviceList[i].lat, this.deviceList[i].lon);
			zoom = 12;
		}
	}

    var mapOptions = {
        zoom: zoom,
        center: center,
        mapTypeId: 'terrain',
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        },
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.RIGHT_TOP
        }
    };

    this.map = new Map(document.getElementById('map-canvas'), mapOptions);
    this.map.add(this.deviceList);
};


// this is called from socket, when time is succesfully set
Container.prototype.onSetTime = function() {
    customer.getSocket().getTime();
};

Container.prototype.getPreferredSerialNumber = function() {
    var timestamp = 0;
    var serial = null;
    for (var i in this.deviceList) {
        if (this.deviceList[i].rt > timestamp) {
            timestamp = this.deviceList[i].rt;
            serial = this.deviceList[i].s;
        }
    }
    if (serial !== null) {
        return serial;
    }
    return this.deviceList[0].s;
};

/**
 *  create dashboard[0] from this.activeDevice
 */
Container.prototype.loadDevice = function() {
    console.info("[Container] Load device " + this.activeDevice);
    
    this._hideAll();
    jQuery('#container').show();
    
    var sensors = [];
    var device = this.getDevice(this.activeDevice);
    
    if (device === null) {
        customer.alert('Device not available', customer.alerts.danger, true, 0);
    }
    
    this.device = new Device(device);
    sensors.push({deviceId: this.activeDevice});

    var o = new ObjectWaiter(sensors);    
    o.done = jQuery.proxy(
        function() {
            //console.log("[Container] List of available sensors:");
            //console.log(this.sensors);
            this.loadDefaults();
            this.createDashboards();
        }, this
    );
    o.sensors();
};


Container.prototype.loadDeviceList = function() {
    this._hideAll();
    jQuery('#devicelist').show();
    this.deviceList.sort(function(a, b){
        return b.rt-a.rt;
    });
    createDeviceList(this.deviceList);
};

/* ABOVE THIS LINE, THE CODE IS STILL A MESS. BELOW IT SHOULD BE OK ONCE */

Container.prototype.loadDashboard = function() {
    console.warn("[Container] Loading dashboard " + this.activeDashboard);

    var sensors = [];
    var boxes = this.settings.dashboards[this.activeDashboard].boxes;
    for (var b in boxes) {
        var box = boxes[b];

        for (var s in box.sensors) {
            var sensor = box.sensors[s];
            if (typeof sensor === 'undefined') throw "Sensor undefined !!!";

            sensors.push({
                deviceId: sensor,
                sensorId: s,
            });
        }
    }

    var o = new ObjectWaiter(sensors);    
    o.done = jQuery.proxy(
        function() {
            console.debug("[Container] List of available sensors:");
            console.dir(this.sensors);
            this.createDashboards();
        }, this
    );
    o.sensors();
    
    this._hideAll();
    jQuery('#container').show();
}

Container.prototype.loadDefaults = function() {
    var boxes = this.createGaugeSettings().concat([
        this.createClockSettings(),
        this.createMultilineSettings(),
        this.createWindroseVelocitySettings(),
        this.createWindroseSmokeTrailSettings(),
        //this.createWindroseVectorSettings(),
        this.createAveragesSettings(),
    ]).filter(
        function (box) {
            return box !== null;
        }
    );

    var defaultSettings = {
        "dashboards": [
            {
                "boxes": boxes,
                "enabled": true,
                "name": "default dashboard"
            },
        ]
    };

    console.debug("Default settings for boxes are:");
    console.dir(defaultSettings.dashboards[0].boxes);
    
    this.extendSoftSettings(defaultSettings);
    return this;
};

Container.prototype.createDashboards = function() {
    console.debug("[Container] Creating dashboards from settings:");
    console.dir(this.settings.dashboards);
	this.dashboards = [];

    for (var d in this.settings.dashboards) {
        if (d != this.activeDashboard) {
            this.dashboards.push(null);
            continue;
        }
        var dashboard = new Dashboard(this.settings.dashboards[d]);
        dashboard.extendSoftSettings(this.softSettings.dashboards[d]);

        this.dashboards.push(dashboard);
    }

    console.debug("[Container] Created dashboards");
    
    var dashboard = this.dashboards[this.activeDashboard];
    
    //TODO: move unregister somewhere else
    console.info('Feeder is ' + (this.feeder === null ? 'undefined' : 'defined'));
    if (this.feeder !== null) {
        customer.socket.unregisterAll();
    }
    
    //TODO: dynamic defaults
    if (typeof dashboard.softSettings.rangeFrom === 'undefined') {
        dashboard.softSettings.rangeFrom = -60;
    }
    if (typeof dashboard.softSettings.rangeTo === 'undefined') {
        dashboard.softSettings.rangeTo = 0;
    }

    //finish
    this.feeder = new Feeder(dashboard.boxes, dashboard.softSettings.rangeFrom, dashboard.softSettings.rangeTo);
    this.render();
};

Container.prototype.createMultilineSettings = function() {
    var multilineSettings = {
        id:         'multiline',
        type:       'graph.multiline',
        sensors:    {},
        title:      'multiline',
        timeout:    7*86400,
        historical: true
    };

    for (var i in this.sensors) {
        if(this.sensors[i].source !== SensorSources.hw){
            continue;
        }
        if (typeof this.sensors[i].measure === 'undefined') {
        	console.log('Ignoring ' + this.sensors[i].name)
            continue;
        }
        multilineSettings.sensors[i] = this.sensors[i].deviceId;
    }

    console.debug("[Container] Created multiline settings:");
    console.dir(multilineSettings);

    return multilineSettings;
}

Container.prototype.createClockSettings = function() {
    var clockSettings = [];
        
    var settings  = {
        id:         'clock', // + sensor.measure.name,
        type:       'clock',
        sensors:    {},
        //measure:    sensor.measure,
        //title:      sensor.measure.verboseName,
        timeout:    60,
        historical: false
    };

    clockSettings.push(settings);

    console.debug("[Container] Created clock settings:");
    console.dir(clockSettings);
    return settings;
}

Container.prototype.createGaugeSettings = function() {
    var gaugeSettings = [];
    
    for (var s in this.sensors) {
        var sensor = this.sensors[s];
        
        if(sensor.source !== SensorSources.hw){
            continue;
        }
        
        if (typeof sensor.measure === 'undefined') {
        	console.log('Ignoring ' + sensor.name)
            continue;
        }
        
        var settings  = {
            id:         'gauge-' + sensor.measure.name,
            type:       'gauge',
            sensors:    {},
            measure:    sensor.measure,
            title:      sensor.measure.verboseName,
            timeout:    60,
            historical: false
        }
        settings.sensors[sensor.id] = this.sensors[s].deviceId;
        
        gaugeSettings.push(settings);
    }

    console.debug("[Container] Created gauge settings:");
    console.dir(gaugeSettings);
    return gaugeSettings;
}

Container.prototype.createWindroseVelocitySettings = function() {
    var sensorSpeed = undefined;
    for (var i in this.sensors) {
        if(this.sensors[i].measure === undefined){
            continue;
        }
        if (this.sensors[i].measure.name === 'windSpeed') sensorSpeed = this.sensors[i];
    }
    var sensorDirection = undefined;
    for (var i in this.sensors) {
        if(this.sensors[i].measure === undefined){
            continue;
        }
        if (this.sensors[i].measure.name === 'windDirection') sensorDirection = this.sensors[i];
    }

    if ((typeof sensorSpeed !== 'undefined') && (typeof sensorDirection !== 'undefined')) {
        var windroseSettings = {
            id:         'default-windrose-velocity',
            sensors:    {},
            type:       'windrose.velocity',
            title:      'Wind velocity',
            timeout:    6*3600,
            historical: true
        }
        windroseSettings.sensors[sensorSpeed.id] = this.sensors[sensorSpeed.id].deviceId;
        windroseSettings.sensors[sensorDirection.id] = this.sensors[sensorDirection.id].deviceId;

        console.debug("[Container] Created windrose (velocity) settings:");
        console.dir(windroseSettings);
        return windroseSettings;
    } else {
        return null;
    }
}

Container.prototype.createWindroseSmokeTrailSettings = function() {
    var sensorSpeed = undefined;
    for (var i in this.sensors) {
        if(this.sensors[i].measure === undefined){
            continue;
        }
        if (this.sensors[i].measure.name === 'windSpeed') sensorSpeed = this.sensors[i];
    }
    var sensorDirection = undefined;
    for (var i in this.sensors) {
        if(this.sensors[i].measure === undefined){
            continue;
        }
        if (this.sensors[i].measure.name === 'windDirection') sensorDirection = this.sensors[i];
    }

    if ((typeof sensorSpeed !== 'undefined') && (typeof sensorDirection !== 'undefined')) {
        var windroseSettings = {
            id:         'default-windrose-smoketrail',
            sensors:    {},
            type:       'windrose.smoketrail',
            title:      'Smoke trail',
            timeout:    6*3600,
            historical: true
        }
        windroseSettings.sensors[sensorSpeed.id] = this.sensors[sensorSpeed.id].deviceId;
        windroseSettings.sensors[sensorDirection.id] = this.sensors[sensorDirection.id].deviceId;

        console.debug("[Container] Created windrose (smoketrail) settings:");
        console.dir(windroseSettings);
        return windroseSettings;
    } else {
        return null;
    }
}

Container.prototype.createWindroseVectorSettings = function() {
    var sensorSpeed = undefined;
    for (var i in this.sensors) {
        if(this.sensors[i].measure === undefined){
            continue;
        }
        if (this.sensors[i].measure.name === 'windSpeed') sensorSpeed = this.sensors[i];
    }
    var sensorDirection = undefined;
    for (var i in this.sensors) {
        if(this.sensors[i].measure === undefined){
            continue;
        }
        if (this.sensors[i].measure.name === 'windDirection') sensorDirection = this.sensors[i];
    }

    if ((typeof sensorSpeed !== 'undefined') && (typeof sensorDirection !== 'undefined')) {
        var windroseSettings = {
            id:         'default-windrose-vector',
            sensors:    {},
            type:       'windrose.vector',
            title:      'Windroze',
            timeout:    30,
            historical: true,
            angleSeries:8, // wind direction pizza slice count
            segments:   6  // wind speed circle count
        }
        windroseSettings.sensors[sensorSpeed.id] = this.sensors[sensorSpeed.id].deviceId;
        windroseSettings.sensors[sensorDirection.id] = this.sensors[sensorDirection.id].deviceId;

        console.debug("[Container] Created windrose (vector) settings:");
        console.dir(windroseSettings);
        return windroseSettings;
    } else {
        return null;
    }
}

Container.prototype.createAveragesSettings = function() {
    var averagesSettings = {
        id:         'averages',
        type:       'averages',
        sensors:    {},
        title:      'averages',
        timeout:    60,
        historical: false
    };
    
    for (var i in this.sensors) {
        if(this.sensors[i].source !== SensorSources.hw){
            continue;
        }
        if (typeof this.sensors[i].measure === 'undefined') {
        	console.log('Ignoring ' + this.sensors[i].name)
            continue;
        }
        averagesSettings.sensors[i] = this.sensors[i].deviceId;
    }

    console.debug("[Container] Created averages settings:");
    console.dir(averagesSettings);

    return averagesSettings;
}


/* END OF KVÍK CLEANING */

Container.prototype.isControllerDevice = function() {
    return (this.activeController === 'device');
};

Container.prototype.getActiveDashboard = function() {
    return this.dashboards[this.activeDashboard];
};

Container.prototype.getDevice = function(serial) {
    for (var i in this.deviceList) {
        if (serial === this.deviceList[i].s) {
            return this.deviceList[i];
        }
    }
    
    return null;
};

Container.prototype.getActiveDevice = function(attribute) {
    for (var i in this.deviceList) {
        if (this.device.serialNo === this.deviceList[i].s) {
            if (attribute)
                return this.deviceList[i][attribute];
            return this.deviceList[i];
        }
    }
};

Container.prototype.setAsInactive = function() {
    console.debug("[Container] Setting as inactive!");

    for (var d in this.dashboards) {
        this.dashboards[d].setAsInactive();
    }
};

Container.prototype._createDashboardItems = function(dashboards) {
    var deviceList = jQuery('#device-list > ul').empty();
    
    // create links for dashboards
    for (var d in dashboards) {
        if (d == 0) continue;
        var name = dashboards[d].name;
        var bold = (d == this.activeDashboard);
        var icon = (dashboards[d].rangeTo > 0) ? 'glyphicon-time' : 'glyphicon-dashboard';
        this._createDashboardItem(deviceList, name, '#dashboard/' + d, icon, false, bold, d);
    }
    if (dashboards && dashboards.length > 1) {
        var $li = jQuery('<li class="divider"/>');
        $li.appendTo(deviceList);
    }
    
    // sorting
    var deviceTimestampList = [];
    for (var i in this.deviceList) {
        var timestamp = this.deviceList[i].rt;
        if (deviceTimestampList.indexOf(timestamp) === -1) {
            deviceTimestampList.push(timestamp);
        }
    }
    deviceTimestampList = deviceTimestampList.sort();
    deviceTimestampList.reverse();
    
    // create device links
    for (var t in deviceTimestampList) {
    for (var i in this.deviceList) {
        
        if (deviceTimestampList[t] != this.deviceList[i].rt) continue;
        
        var item = this.deviceList[i];
        var serialNo = item.s;
        var name = item.dname ? item.dname : serialNo;
        var bold = (item.s === this.activeDevice);
        
        var icon = 'glyphicon-star';
        switch(item.hw_no) {
            case 'WWODEVICEHW01':
                icon = 'glyphicon-globe';
                break;
            case 'H001':
                icon = 'glyphicon-tower';
                continue; // don't show SERVER
                break;
            default:
                if (item.dtype === 'VIA_COLLECTOR') icon = 'glyphicon-flash';
        }
        this._createDashboardItem(deviceList, name, '#device/' + serialNo, icon, false, bold);
    }}
}

Container.prototype._createDashboardItem = function($obj, name, href, icon, prepend, bold, deleteId) {
    var $li = jQuery('<li />');
    var $a = jQuery('<a />').attr({href: href});
    jQuery('<b />').attr({class: 'glyphicon ' + icon}).appendTo($a);
    jQuery('<span />').text(' ' + name).css('font-weight', bold ? 'bold' : 'normal').appendTo($a);
    if (deleteId) {
        jQuery('<span />').data('id', deleteId).text('x').css('float', 'right').click(function(event) {
            event.stopPropagation();
            //console.info(event);
            customer.container.removeDashboard(jQuery(event.currentTarget).data('id'));
        }).appendTo($a);
    }
    $a.appendTo($li);
    
    // dashboard list toggle
    $li.bind('click', function(){ 
        jQuery(this).parent().toggle();
    });
    
    if (prepend) {
        $li.prependTo($obj);
    } else {
        $li.appendTo($obj);
    }
};

Container.prototype.moveBoxesToPosition = function(){
    console.debug('[Container] size changed to: ' + this.bootstrapSize);
    if (this.bootstrapSize === 'md' || this.bootstrapSize === 'lg')
        this.moveBoxesToColumn();
    else if (this.bootstrapSize === 'sm')
        this.moveBoxesToDualColumns();
    else if (this.bootstrapSize === 'xs')
        this.moveBoxesToGrid();
};

Container.prototype.moveBoxesToColumn = function() {
    for(var d in this.dashboards){
        if(d == this.activeDashboard){
            this.dashboards[d].moveBoxesToColumn();
            break;
        }
    }
}

Container.prototype.moveBoxesToDualColumns = function() {
    for(var d in this.dashboards){
        if(d == this.activeDashboard){
            this.dashboards[d].moveBoxesToDualColumns();
            break;
        }
    }
}

Container.prototype.moveBoxesToGrid = function() {
    for(var d in this.dashboards){
        if(d == this.activeDashboard){
             this.dashboards[d].moveBoxesToGrid();
            break;
        }
    }
}

Container.prototype.displayLive = function(value) {
    var $rangeBox = jQuery('div.navbar > div > div.navbar-collapse ul > li.live-range');
    
    if (value === null) {
        $rangeBox.find('.selection').parent().hide();
        return;
    }
    $rangeBox.find('.selection').parent().show();
    
    console.info('Live ' + value);
    $rangeBox.find('ul > li > a').each(function() {
        var option = jQuery(this);
        if(option.data('time') == value) {
            $rangeBox.find('.selection').text(option.text());
        }
    });
};

Container.prototype.displayRange = function(start, end) {
    var $rangeBox = jQuery('div.navbar > div > div.navbar-collapse ul > li.wind101-history');
    
    if (start === null) {
        $rangeBox.find('span.selection').hide();
        return;
    }
    $rangeBox.find('span.selection').show();
    
    var start = moment(start);
    var end = moment(end);
    
    console.info('Historical ' + start + ' - ' + end);
    var text = start.format(customer.getSettings().displayDateFormat) + ' - ' + end.format(customer.getSettings().displayDateFormat);
    $rangeBox.find('span.selection').text(text);
    
    this.dateRangeControl.data('daterangepicker').setStartDate(start);
    this.dateRangeControl.data('daterangepicker').setEndDate(end);
};

Container.prototype.createRangeControl = function() {
    if (this.dateRangeControl === null) {
    
        console.debug('[Daterangepicker]');
    
        this.dateRangeControl = jQuery('#reportrange').daterangepicker({
            timePicker: true
        }, function(start, end, label) {
            console.info('[Daterangepicker] ' + start.toISOString() + ', ' + end.toISOString() + '|' + label);
        });

        // daterange
        jQuery('#reportrange').on('apply.daterangepicker', function(ev, picker) {
            var rangeFrom = picker.startDate;
            var rangeTo = picker.endDate;
            console.info([rangeFrom.unix(),rangeTo.unix()]);

            customer.container.softSettings = customer.container.getSoftSettings();
            customer.container.softSettings.dashboards[customer.container.activeDashboard].rangeFrom = 1000*rangeFrom.unix();
            customer.container.softSettings.dashboards[customer.container.activeDashboard].rangeTo = 1000*rangeTo.unix();
            customer.container.createDashboards();
        });
    }
    
    this.dateRangeControl.collapse();
    
    var dashboard = customer.container.getActiveDashboard();
    var rangeFrom = dashboard.softSettings.rangeFrom;
    var rangeTo = dashboard.softSettings.rangeTo;
    if (rangeTo > 0) {
        this.displayLive(null);
        this.displayRange(rangeFrom, rangeTo);
    } else {
        this.displayLive(-rangeFrom);
        this.displayRange(null);
    }
};



Container.prototype._hideAll = function() {
    jQuery('#container').hide();
    jQuery('#devicelist').hide();
    jQuery('#map-canvas').hide();
};

Container.prototype.getSensorId = function(deviceId, sensorName) {
    for(var s in this.sensors){
        if(this.sensors[s].deviceId === deviceId && this.sensors[s].name === sensorName){
            return this.sensors[s].id;
        }
    }
};

Container.prototype.getSensorNameById = function(id){
    for(var s in this.sensors){
        if(this.sensors[s].id === id){
            return this.sensors[s].name;
        }
    }
};

Container.prototype.hasSensorName = function(id, sensorNames) {
    for(var s in sensorNames){
        if(this.sensors[id].name === sensorNames[s]) {
            return true;
        }
    }
    
    return false;
};

Container.prototype.getActiveDeviceCount = function() {
    var count = 0;
    var ts = new Date().getTime() - 30000;
    for (var i in this.deviceList) {
        if (this.deviceList[i].rt < ts) continue;
        if (this.deviceList[i].dtype === 'SERVER') continue;
        if (this.deviceList[i].dtype === 'FORECAST') continue;
        count++;
    }
    return count;
};

Container.prototype.removeDashboard = function(index) {
    console.info('[Container] removeDashboard: ' + index);
    if (index === undefined) {
        index = this.activeDashboard;
    }
    var length = this.dashboards.length;
    var dashboardChanged = !this.isControllerDevice();
    
    // remove last and only dashboard
    if (length == 2 && index == (length-1)) {
        this.activeDevice = this.getPreferredSerialNumber();
        customer.saveSettings(dashboardChanged, index, this.activeDevice);
    // remove not last dashboard/last dashboard(change of activeDashboard required inside saveSettings)
    } else {
        customer.saveSettings(dashboardChanged, index);
    }
};

Container.prototype.showMapHistoricalData = function(deviceId, infowindow) {
    var dataTimestamp = 0;
    var o = new ObjectWaiter([{deviceId: deviceId}]);
    o.done = jQuery.proxy(function() {
        var sensors = {};               // sensors from selected device
        var windroseSensors = {};       // sensors for windrose
        var forecastSensor;             // sensor for forecast
        
        // find sensors in device, windroseSensors in device, forecastSensor in device
        for(var i in this.sensors){
            var sensor = this.sensors[i];
            if(sensor.deviceId === deviceId){
                sensors[sensor.id] = sensor;
                if(sensor.name === 'w' || sensor.name === 'ws' || sensor.name === 'wd'){
                    windroseSensors[sensor.id] = sensor;
                }
                if(sensor.name === 'forecast'){
                    forecastSensor = sensor;
                }
            }
        }
        
        // FORECAST / LAST DATA (in corners)
        var availableSensors = {
            t:  true,
            t1: true,
            h:  true,
            p:  true,
            w:  true,
            ws: true,
            forecast: true,
        };
        
        var historicalDataRequested = false;
        
        for (var s in sensors) {
            var sensor = sensors[s];
            if (availableSensors[sensor.name]) {
                msg = new MessageSensorDataRequest(customer.sessionId, 100000, sensor.id, 1406060030000, 86400*1000+(new Date()).getTime(), 'LAST');
                msg.done = jQuery.proxy(function(data) {
                    var sensorName = customer.container.getSensorNameById(data.ai[0].id);
                    dataTimestamp = data.ai[0].ts;
                    var $info = jQuery(infowindow.div_);
                    switch (sensorName) {

                        // FORECAST
                        case 'forecast':
                            var json = JSON.parse(data.ai[0].value);

                            var gsDayNames = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
                            for (var i = 1; i < 3; i++) {
                                $info.find('.farecast-date-0' + i + ' > p').html(json.data.weather[i].date);
                                $info.find('.farecast-day-0' + i + ' > p').html(gsDayNames[new Date(json.data.weather[i].date).getDay()]);
                                $info.find('.farecast-other-0' + i + ' > p').html(json.data.weather[i].precipMM + " mm - Precip.<br>" +
                                        (json.data.weather[i].windspeedKmph / 3.6).toFixed(1) + " m/s - Wind");
                                $info.find('.forecast-temp-orig-0' + i + '').data("w", json.data.weather[i].windspeedKmph);
                                $info.find('.forecast-temp-orig-0' + i + ' > p').html(json.data.weather[i].tempMaxC + " &degC");
                                $info.find('.forecast-temp-orig-0' + i + '').data("t", json.data.weather[i].tempMaxC);
                                $info.find('.farecast-temp-feel-0' + i + ' > p').html("N/A");
                                $info.find('.forecast-temp-night-0' + i + ' > p').html(json.data.weather[i].tempMinC + " &degC");

                                var imgCode = '0';
                                var found = false;
                                var weatherCode = json.data.weather[i].weatherCode;
                                for(var key in this.forecastIconCodeMap){
                                    for(var wc in this.forecastIconCodeMap[key]){
                                        if(this.forecastIconCodeMap[key][wc] === weatherCode){
                                            imgCode = key;
                                            found = true;
                                            break;
                                        }
                                    }
                                    if(found)
                                        break;
                                }
                                
                                $info.find('.forecast-wather-icon-0' + i + ' > img').attr('src', 'assets/img/forecast/day/' + imgCode + '.png');
                                $info.find('.forecast-icon-night-0' + i + ' > img').attr('src', 'assets/img/forecast/night/' + imgCode + '.png');
                            }
                            break;

                        // LAST DATA
                        case 't':
                        case 't1':
                            $info.find('.temperature > p').html((data.ai[0].value - 273.15).toFixed(1));
                            break;
                        case 'h':
                            $info.find('.huminidy > p').html((data.ai[0].value * 100).toFixed(1));
                            break;
                        case 'p':
                            $info.find('.pressure > p').html((data.ai[0].value / 100).toFixed(0));
                            break;
                        case 'w':
                        case 'ws':
                            $info.find('.wind > p').html((data.ai[0].value).toFixed(2));
                            break;
                    }

                    // WINDROSE
                    if (!historicalDataRequested) {
                        historicalDataRequested = true;
                        var windroseAggregator = new Aggregator({timeout: 28800, sensors: windroseSensors});
                        var windrose = new WindroseVelocity($info.find('.windrose'), windroseAggregator, {sensors: windroseSensors});
                        windrose.resize(260, 212);

                        for (var s in windroseSensors) {
                            var msg = new MessageSensorDataRequest(customer.sessionId, 0.1 * 60 * 60 * 1000, windroseSensors[s].id, dataTimestamp - 8 * 60 * 60 * 1000, dataTimestamp, 'AVG');
                            msg.done = function (data) {
                                for (var i = 0; i < data.al; i++) {
                                    var pushable = {
                                        timestamp: data.ai[i].ts / 1000,
                                        value: data.ai[i].value,
                                        sensorId: data.ai[i].id,
                                    };

                                    windroseAggregator.push(pushable);
                                }
                                windrose.fetchData(Units);
                                windrose.render();
                            };
                            msg.request();
                        }
                        
                        //sparklines
                        var sparklineSensors = {
                            t: true,
                            t1: true,
                            h: true,
                            p: true,
                            w: true,
                            ws: true,
                        }
                        
                        for (var s in sensors) {
                            var sensor = sensors[s];
                            if (sparklineSensors[sensor.name]) {
                                var msg = new MessageSensorDataRequest(customer.sessionId, 3 * 3600 * 1000, sensor.id, Date.now() - 3600 * 1000 * 24, Date.now(), 'AVG');
                                msg.done = function (data) {
                                    if (data.al == 0)
                                        return;

                                    var sensorName = customer.container.getSensorNameById(data.ai[0].id);
                                    var myvalues = [];
                                    for (var i = 0; i < data.al; i++)
                                        myvalues[i] = data.ai[i].value;

                                    switch (sensorName) {
                                        case 'h':
                                            for (var i = 0; i < myvalues.length; i++)
                                                myvalues[i] = (myvalues[i] * 100).toFixed(1);
                                            $info.find('.hum-plot > p').sparkline(myvalues, {type: 'bar', barColor: '#d75056', zeroAxis: false, height: '36', barWidth: 9, barSpacing: 2});
                                            break;
                                        case 't':
                                        case 't1':
                                            for (var i = 0; i < myvalues.length; i++)
                                                myvalues[i] = (myvalues[i] - 273.15).toFixed(1);
                                            $info.find('.temp-plot > div').sparkline(myvalues, {type: 'bar', barColor: '#43a0bf', zeroAxis: false, height: '36', barWidth: 9, barSpacing: 2});
                                            break;
                                        case 'p':
                                            for (var i = 0; i < myvalues.length; i++)
                                                myvalues[i] = (myvalues[i] / 100).toFixed(0);
                                            $info.find('.pres-plot > p').sparkline(myvalues, {type: 'bar', barColor: '#ffb446', zeroAxis: false, height: '36', barWidth: 9, barSpacing: 2});
                                            break;
                                        case 'w':
                                        case 'ws':
                                            for (var i = 0; i < myvalues.length; i++)
                                                myvalues[i] = (myvalues[i]).toFixed(2);
                                            $info.find('.wind-plot > p').sparkline(myvalues, {type: 'bar', barColor: '#80d077', zeroAxis: false, height: '36', barWidth: 9, barSpacing: 2});
                                            break;
                                    }
                                    myvalues = [];
                                };
                                msg.request();
                            }
                        }
                    }
                }, this);
                msg.request();
            }
        }
                
        // DATA TIME
        // TO DO: stop timer on infowindow close
        setInterval(function() {
            if(dataTimestamp){
                var ms = Date.now() - dataTimestamp;
                console.log(Date.now() + ' - ' + dataTimestamp + ' = ' + ms);
                var timestr;
                if (ms < 1000)
                    timestr = ms + " ms ago";
                else if (ms < 60000)
                    timestr = Math.floor(ms / 1000) + " sec ago";
                else
                    timestr = Math.floor(ms / 60000) + " min ago";
                jQuery(infowindow.div_).find('.name-devices > div').eq(0).html(': ' + timestr);
            }
        }, 900);
    }, this);
    
    o.sensors();
};