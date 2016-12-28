
/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Martin K. Schröder <mkschreder.uk@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

!function(){
	function EventManager(){
			this.callbacks = {};
	}
	EventManager.prototype.removeAll = function(){
		this.callbacks = {};
	}
	EventManager.prototype.subscribe = function(type, callback){
		if(!this.callbacks[type]) this.callbacks[type] = []; 
		this.callbacks[type].push(callback); 
	}
	JUCI.events = new EventManager();
	
	JUCI.app.run(function($rpc){
		var last_handled_time = 0;  
		var self = JUCI.events;
		setInterval(function(){
			if($rpc.juci == undefined || !$rpc.juci.event || !$rpc.juci.event.poll) return;  
			$rpc.juci.event.poll().done(function(result){
				var new_time = 0; 
				if(!result || !result.list) return; 
				result.list.map(function(event){
					if(event.time > last_handled_time){
						if(new_time < event.time) new_time = event.time;
						console.log("Event: "+JSON.stringify(event)); 
						var cb = self.callbacks[event.type]; 
						if(cb){
							cb.map(function(c){
								c.apply(event, [event]); 
							});  
							last_handled_time = event.time; 
						}
					}
				}); 
				last_handled_time = new_time; 
			}); 
		}, 5000);  
	}); 
	
	JUCI.app.factory("$events", function(){
		return JUCI.events; 
	}); 
	
}();
UCI.juci.$registerSectionType("juci_event", {
	"filter":	{ dvalue: [], type: Array }
});
UCI.juci.$insertDefaults("juci_event");

/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Martin K. Schröder <mkschreder.uk@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

JUCI.app
.controller("EventLogConfigPage", function($scope, $uci, $systemService){ 
	$uci.$sync("system").done(function(){
		$scope.system = $uci.system["@system"][0]; 
		$scope.$apply(); 
	}); 
}); 

/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Martin K. Schröder <mkschreder.uk@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

JUCI.app
.controller("StatusEventsPageCtrl", function($scope, $rpc, $config, $tr, gettext){
	var log = {
		autoRefresh : true
	};
	var timeoutID = undefined;
	var request = null;
	$scope.data = { limit: 20, filter: "", type: "" };
	$scope.sid = $rpc.$sid(); 
	$scope.filters = [];
	
	if($config.settings.juci_event) $config.settings.juci_event.filter.value.map(function(x){
		var filter = x.split(".")[0];
		var id = x.split(".")[1];
		if(inFilters(filter) == -1) $scope.filters.push({name:filter, filters:[id], checked:false});
		else $scope.filters[inFilters(filter)].filters.push(id);
	});

	function inFilters(filter){
		for(var i = 0; i < $scope.filters.length; i++){
			if($scope.filters[i].name == filter) return i;
		}
		return -1;
	};
	
	$scope.allLimits = [
		{ label: 20, value: 20 }, 
		{ label: 50, value: 50 }, 
		{ label: 100, value: 100 }, 
		{ label: 200, value: 200 }
	]; 
	$scope.types = [
		{ label:$tr(gettext("All types")),		value: "" },
		{ label:$tr(gettext("Emergency")),		value: "emerg" },
		{ label:$tr(gettext("Alert")),			value: "alert" },
		{ label:$tr(gettext("Critical")),		value: "crit" },
		{ label:$tr(gettext("Warning")),		value: "warn" },
		{ label:$tr(gettext("Notice")),			value: "notice" },
		{ label:$tr(gettext("Informational")),	value: "info" },
		{ label:$tr(gettext("Debug")),			value: "debug" }
	];

	function update(){
		var limit = "";
		$scope.filters.map(function(x){
			if(!x.checked) return;
			x.filters.map(function(lim){
				limit += lim + "\|";
			});
		});
		if($scope.data.filter == "") limit = limit.slice(0, -1);
		else limit += $scope.data.filter;
		if(request === null){
			request = $rpc.juci.system.log({
				limit: $scope.data.limit, 
				filter: limit,
				type: $scope.data.type
			}).done(function(result){
				if(result && result.lines){
					$scope.logs = result.lines; 
					$scope.$apply();
				}
			}).always(function(){
				request = null;
			}); 
		}
		return request;
	}

	$scope.applyFilter = function(){
		$scope.inprogress = true;
		if(typeof timeoutID === "number"){
			clearTimeout(timeoutID);
		}
		log.autoRefresh = false;
		timeoutID = setTimeout(function(){log.autoRefresh = true;}, 1000);
		update().always(function() {
			$scope.inprogress = false;
			$scope.$apply();	
		});
	};
	
	$scope.onDownloadLogs = function(){
		$rpc.juci.system.logs.download().done(function(result){
			if(result.id) window.open(window.location.origin+"/cgi-bin/juci-download?id="+result.id); 
			else alert($tr(gettext("Could not download logs!"))); 
		}); 
	}

	JUCI.interval.repeat("syslog", 1000, function(done){
		if(!log.autoRefresh){
			done();
			return;
		}
		update().always(function(){
			done();
		});;
	}); 

	$scope.lineClass = function(line){
		if(line.type.indexOf("error") >= 0) return "label-danger"; 
		if(line.type.indexOf("warn") >= 0) return "label-warning";  
		if(line.type.indexOf("notice") >= 0 || line.type.indexOf("info") >= 0) return "label-info"; 
		return ""; 
	}
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Log Settings":"Log Settings","Log size":"","Size of the file or circular memory buffer in KiB.":"","Log size in KB":"","Console Log Level":"","Number between 1-8. The maximum log level for kernel messages to be logged to the console. Only messages with a level lower than this will be printed to the console.":"","Log level 1-8":"","Enable remote logging":"","Logging server IP":"","IP address of a syslog server to which the log messages should be sent in addition to the local destination.":"","Log port":"","Port number of the remote syslog server specified with log_ip.":"","Server port":"Server port","Event Log":"","status.eventlog.info":"Select the categories for which you would like to view the event log.","Log":"","Enter search string":"","Date":"","Type":"","Source":"","Message":"","event-log-config-title":"Log Settings","status-events-title":"Event Log","menu-event-log-config-title":"Log Settings","menu-status-events-title":"Event Log"});
	gettextCatalog.setStrings('fi', {"Log size":"Lokin koko","Size of the file or circular memory buffer in KiB.":"Size of the file or circular memory buffer in KiB.","Log size in KB":"Lokin koko KB","Console Log Level":"Konsolin lokitaso","Number between 1-8. The maximum log level for kernel messages to be logged to the console. Only messages with a level lower than this will be printed to the console.":"Numero välillä 1-8. Suurin lokitaso mikä tallentaa kernelin viestejä konsoliin. Vain tätä lokitasoa alemmat viestit tulostetaan konsoliin.","Log level 1-8":"Lokitaso 1-8","Enable remote logging":"Ota käyttöön etäloki","Logging server IP":"Palvelimen loki","IP address of a syslog server to which the log messages should be sent in addition to the local destination.":"Syslog-palvelimen IP-osoite johon lokiviestit lähetetään","Log port":"Portti","Port number of the remote syslog server specified with log_ip.":"Etälokipalvelimen portin numero","Server port":"Palvelimen portti","event-log-config-title":"Loki","menu-event-log-config-title":"Tapahtumaloki"});
	gettextCatalog.setStrings('sv-SE', {"Log size":"Loggens storlek","Size of the file or circular memory buffer in KiB.":"Storlek på loggfilen i KiB","Log size in KB":"Loggstorlek i KB","Console Log Level":"Loggnivå","Number between 1-8. The maximum log level for kernel messages to be logged to the console. Only messages with a level lower than this will be printed to the console.":"Nummer mellan 1-8. Maximal loggnivå för meddelanden som ska loggas till konsolen. Endast meddelanden med lägre nivå kommer att loggas till konsolen. ","Log level 1-8":"Loggnivå 1-8","Enable remote logging":"Slå på remote-loggning","Logging server IP":"IP för loggservern","IP address of a syslog server to which the log messages should be sent in addition to the local destination.":"IP adress till servern dit loggmeddelnanden kommer att loggas","Log port":"Log port","Port number of the remote syslog server specified with log_ip.":"Portnummer på syslog servern","Server port":"Server port","event-log-config-title":"Inställningar","menu-event-log-config-title":"Inställningar"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("pages/event-log-config.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"EventLogConfigPage\">\n<juci-config title=\"{{'Log Settings'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{'Log size'|translate}}\" help=\"{{'Size of the file or circular memory buffer in KiB.'|translate}}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"system.log_size.value\" placeholder=\"{{'Log size in KB'|translate}}\"></input>\n</juci-config-line>\n<juci-config-line title=\"{{'Console Log Level'|translate}}\" \nhelp=\"{{'Number between 1-8. The maximum log level for kernel messages to be logged to the console. Only messages with a level lower than this will be printed to the console.'|translate}}\">\n<input type=\"number\" min=\"1\" max=\"8\" class=\"form-control\" ng-model=\"system.conloglevel.value\" placeholder=\"{{'Log level 1-8'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Enable remote logging'|translate}}\">\n<switch ng-model=\"system.log_remote.value\" class=\"green\"></switch>\n</juci-config-line>\n<juci-config-line ng-show=\"system.log_remote.value\"\ntitle=\"{{'Logging server IP'|translate}}\" help=\"{{'IP address of a syslog server to which the log messages should be sent in addition to the local destination.'|translate}}\">\n<juci-input-ipv4-address ng-model=\"system.log_ip.value\"/>\n</juci-config-line>\n<juci-config-line ng-show=\"system.log_remote.value\"title=\"{{'Log port'|translate}}\" help=\"{{'Port number of the remote syslog server specified with log_ip.'|translate}}\">\n<input type=\"number\" class=\"form-control\" min=\"1\" max=\"65535\" ng-model=\"system.log_port.value\" placeholder=\"{{'Server port'|translate}}\"/>\n</juci-config-line>\n</juci-config-lines>\n</juci-config>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/status-events.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"StatusEventsPageCtrl\">\n<juci-config title=\"{{'Event Log'|translate}}\">\n<juci-config-info>{{ 'status.eventlog.info' | translate }}</juci-config-info>\n<juci-config-line title=\"{{'Download All Logs'|translate}}\">\n<button ng-click=\"onDownloadLogs()\" class=\"btn btn-default\" translate>Download As Text</button>\n</juci-config-line>\n<juci-config-line title=\"{{'Limit log list'|translate}}\">\n<juci-select ng-model=\"data.limit\" ng-items=\"allLimits\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Filter log messages'|translate}}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"data.filter\" ng-change=\"applyFilter()\" placeholder=\"{{'Enter search string'|translate}}\">\n</juci-config-line>\n<juci-config-line title=\"{{'Filter by type:'|translate}}\">\n<juci-select ng-items=\"types\" ng-model=\"data.type\"></juci-select>\n</juci-config-line>\n<juci-config-line title=\"{{'Filter by:'|translate}}\" ng-show=\"filters.length > 0\">\n<div class=\"checkbox checkbox-info\" ng-repeat=\"filter in filters track by $index\">\n<input type=\"checkbox\" ng-model=\"filter.checked\" ng-change=\"applyFilter()\" />\n<label><strong>{{filter.name}}</strong></label>\n</div>\n</juci-config-line>\n<div ng-show=\"inprogress\">\n<i class=\"fa fa-spinner fa-spin\"></i>\n</div>\n<div ng-hide=\"inprogress\">\n<table class=\"table\">\n<thead>\n<th translate>Date</th>\n<th translate>Type</th>\n<th translate>Source</th>\n<th translate>Message</th>\n</thead>\n<tr ng-repeat=\"line in logs track by $index\" class=\"{{lineClass(line)}}\">\n<td nowrap>{{line.date}}</td>\n<td>{{line.type}}</td>\n<td>{{line.source}}</td>\n<td>{{line.message}}</td>\n</tr>\n</table>\n</div>\n</juci-config>\n</div>\n</juci-layout-with-sidebar>\n");