
//! Author: Martin K. Schröder <mkschreder.uk@gmail.com>
JUCI.app
.controller("OverviewPageCtrl", function($scope, $rpc, $uci, $config, gettext, $tr){
	function chunk(array, chunkSize) {
		return [].concat.apply([],
			array.map(function(elem,i) {
				return i%chunkSize ? [] : [array.slice(i,i+chunkSize)];
			})
		);
	}
	// get normal widgets
	["overview", "overviewStatus", "overviewSlider"].map(function(widget_area){
		var queue = JUCI.app._invokeQueue.filter(function(x){ 
			return x[1] == "directive" && x[2][0].indexOf(widget_area+"Widget") == 0;
		}); 
		$scope[widget_area+"Widgets"] = queue.map(function(item){
			var directive = item[2][0]; 
			return "<"+directive.toDash()+"/>"; 
		}).sort(); 
	}); 
	$scope.overviewWidgetRows = chunk($scope.overviewWidgets, 3); 
}); 

JUCI.page("overview", "pages/overview.html"); 

//! Author: Martin K. Schröder <mkschreder.uk@gmail.com>

JUCI.app
.controller("StatusAbout", function($scope){
	
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"WAN IP Address":"","Logout":"","Toggle navigation":"","No new events to show":"","About":"","status-about-title":"About","overview-title":"Overview","menu-status-about-title":"About","menu-overview-title":"Overview"});
	gettextCatalog.setStrings('fi', {"WAN IP Address":"WAN IP-osoite","Logout":"Kirjaudu ulos","Toggle navigation":"Vaihda navigaatiota","No new events to show":"Ei tapahtumia.","About":"Tietoja","status-about-title":"Tietoja","overview-title":"Puheluloki","menu-status-about-title":"Tietoja","menu-overview-title":"Yleisnäkymä"});
	gettextCatalog.setStrings('sv-SE', {"WAN IP Address":"WAN IP-adress","Logout":"Logga ut","Toggle navigation":"Toggla navigation","No new events to show":"Inga nya händelser att visa","About":"Om","status-about-title":"About","overview-title":"Översikt","menu-status-about-title":"About","menu-overview-title":"Översikt"});
}]);

