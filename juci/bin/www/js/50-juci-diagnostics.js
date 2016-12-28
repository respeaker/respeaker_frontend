
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
.controller("StatusDiagnostics", function($scope, $rpc, $network){
	$scope.data = {}; 
	$network.getNetworks().done(function(nets){
		$scope.data.allInterfaces = nets.map(function(x){ return { label: x[".name"], value: x[".name"] }; }); 
		$scope.$apply(); 
	}); 
	$scope.onTraceTest = function(){
		$rpc.juci.diagnostics.traceroute({ host: $scope.data.traceHost }).done(function(result){
			if(result.stderr) $scope.data.traceError = result.stderr; 
			$scope.data.traceResults = result.stdout; 
			$scope.$apply(); 
		}).fail(function(error){
			$scope.data.traceResults = ""; 
			$scope.data.traceError = JSON.stringify(error); 
			$scope.$apply(); 
		}); 
	}
	$scope.onPingTest = function(){
		$scope.data.pingResults = "..."; 
		$scope.data.error = "";
		$rpc.juci.diagnostics.ping({ host: $scope.data.pingHost }).done(function(result){
			if(result.stderr) $scope.data.pingError = result.stderr; 
			$scope.data.pingResults = result.stdout; 
			$scope.$apply(); 
		}).fail(function(error){
			$scope.data.pingResults = ""; 
			$scope.data.pingError = JSON.stringify(error); 
			$scope.$apply(); 
		}); 
	}
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Diagnostic Utility":"","status.diagnostics.info":"This section shows a list of tools which can be used to check the status of your network connection.","Automated Diagnostics":"Automated Diagnostics","status.diagnostics.auto.info":"This diagnosis should take up to 2 minutes and cannot be cancelled once it has been started.","Diagnose":"","Ping Test":"","status.diagnostics.ping.info":"Please enter a valid hostname or IP address to execute the Ping test.","Host to ping":"","Ping":"","Ping results":"","Error":"","Tracing Tool":"","status.diagnostics.trace.info":"Please choose the connection type and location where you would like to save the tracing. The tracing will then begin automatically in a separate popup window.","Host to trace":"","Trace":"","Trace results":"","status-diagnostics-title":"Diagnostic Utility","menu-status-diagnostics-title":"Diagnostics"});
	gettextCatalog.setStrings('fi', {"Diagnostic Utility":"Diagnostiikkatyökalu","status.diagnostics.info":" ","Automated Diagnostics":"Automatisoitu vianmääritys","status.diagnostics.auto.info":"Automaattinen diagnostiikka","Diagnose":"Diagnostiikka","Ping Test":"Ping-testi","status.diagnostics.ping.info":"Syötä oikea kohteen verkkonimi tai IP-osoite suorittaaksesi Ping testi.","Host to ping":"Isäntäkone, jota pingataan","Ping":"Ping","Ping results":"Ping-tulokset","Error":"Virhe","Tracing Tool":"Jäljitystyökalu","status.diagnostics.trace.info":"Valitse yhteystyyppi ja sijainti mihin haluat tallentaa jäljityksen. Jäljitys alkaa automaattisesti erillisessä selainikkunassa.","Host to trace":"Jäljitettävä isäntäkone","Trace":"Jäljitä","Trace results":"Jäljityksen tulokset","status-diagnostics-title":"Diagnostiikka","menu-status-diagnostics-title":"Diagnostiikka"});
	gettextCatalog.setStrings('sv-SE', {"Diagnostic Utility":"Diagnostikverktyg","status.diagnostics.info":"I det här avsnittet visas en lista över verktyg som kan användas för att kontrollera status för din nätverksanslutning.","Automated Diagnostics":"Automatiserad diagnostik","status.diagnostics.auto.info":"Denna diagnos bör ta upp till 2 minuter och kan inte avbrytas när den väl har startats.","Diagnose":"Diagnostisera","Ping Test":"Ping Test","status.diagnostics.ping.info":"Ange ett giltigt värdnamn eller IP-adress för att utföra Ping-test.","Host to ping":"Adress att pinga","Ping":"Ping","Ping results":"Pingresultat","Error":"Fel","Tracing Tool":"Spårningsverktyg","status.diagnostics.trace.info":"Välj anslutningstypen och platsen där du vill spara spårning. Spårning kommer då att börja automatiskt i en separat popup-fönster.","Host to trace":"Adress för traceroute","Trace":"Trace","Trace results":"Resultat trace","status-diagnostics-title":"Diagnostik","menu-status-diagnostics-title":"Diagnostik"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("pages/status-diagnostics.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"StatusDiagnostics\">\n<juci-config-heading>{{ 'Diagnostic Utility' | translate }}</juci-config-heading>\n<juci-config-info>{{ 'status.diagnostics.info' | translate }}</juci-config-info>\n<juci-config-section title=\"{{'Ping Test'|translate}}\">\n<p>{{'status.diagnostics.ping.info'|translate}}</p>\n<div class=\"row\">\n<form class=\"form-inline form-group  pull-right\">\n<input type=\"text\" class=\"form-control input-lg\" placeholder=\"{{'Host to ping'|translate}}\" ng-model=\"data.pingHost\"></input>\n<button type=\"submit\" class=\"btn btn-lg btn-default\" ng-click=\"onPingTest()\">{{'Ping'|translate}}</button>\n</form>\n</div>\n<div class=\"alert alert-default\" ng-show=\"data.pingResults\">{{'Ping results'|translate}}: <br/><pre>{{data.pingResults}}</pre></div>\n<div class=\"alert alert-danger\" ng-show=\"data.pingError\">{{'Error'|translate}}: <br/><pre>{{data.pingError}}</pre></div>\n</juci-config-section>\n<juci-config-section title=\"{{'Tracing Tool'|translate}}\">\n<p>{{'status.diagnostics.trace.info'|translate}}</p>\n<div class=\"row\">\n<form class=\"form-inline form-group  pull-right\">\n<input type=\"text\" class=\"form-control input-lg\" placeholder=\"{{'Host to trace'|translate}}\" ng-model=\"data.traceHost\"></input>\n<button type=\"submit\" class=\"btn btn-lg btn-default\" ng-click=\"onTraceTest()\">{{'Trace'|translate}}</button>\n</form>\n</div>\n<div class=\"alert alert-default\" ng-show=\"data.traceResults\">{{'Trace results'|translate}}: <br/><pre>{{data.traceResults}}</pre></div>\n<div class=\"alert alert-danger\" ng-show=\"data.traceError\">{{'Error'|translate}}: <br/><pre>{{data.traceError}}</pre></div>\n</juci-config-section>\n<diagnostics-widget90-speedtest></diagnostics-widget90-speedtest>\n</div>\n</juci-layout-with-sidebar>\n");