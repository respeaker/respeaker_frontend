
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

JUCI.app.factory("dynamicTranslator", function($rootScope){
	var strings = []; 
	$rootScope.$on("$locationChangeSuccess", function(){
		console.log("removing string cache of "+strings.length+" strings."); 
		// reset strings on page
		page_strings = []; 	
	}); 

	return {
		push: function(opts){
			strings.push(opts); 
		},
		apply: function(){
			strings.map(function(obj){
				var tmp = {}; 
				tmp[obj.msgid] = obj.msgstr; 
				gettextCatalog.setStrings(obj.language, tmp); 
			}); 
		}
	}; 
}); 

JUCI.app.run(function($rootScope, gettextCatalog, dynamicTranslator) {
	var getString = gettextCatalog.getString; 
	gettextCatalog.getString = function(a, b, c){
		var ret = getString.call(this, a, b, c); 
		dynamicTranslator.push({
			language: gettextCatalog.currentLanguage, 
			msgid: a, 
			msgstr: ret
		}); 
		return ret; 
	}
});

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Static Address":"Static Routes","DHCP v4":"","DHCP v6":"","PPP over Ethernet":"Internet","wireless.2g.info":"2.4Ghz wireless configuration.","2.4Ghz Wireless":"","Radio Configuration":"","SSID Configuration":"","wireless.5g.info":"Configure your 5Ghz wireless hotspot.","5Ghz Wireless":"","lan.config.info":"LAN Configuration","LAN Configuration":"","dhcp.config.info":"Here you can configure your dhcp settings","DHCP Configuration":"","wan.config.info":"WAN configuration","Configuration Method":"","Choose Configuration Option":"","WAN Configuration":"","simple-lan-config-title":"LAN","simple-services-title":"Services","simple-wan-config-title":"WAN","simple-lan-dhcp-config-title":"DHCP Server","simple-admin-title":"Admin","simple-5g-wireless-title":"5Ghz Wireless","simple-2g-wireless-title":"2Ghz Wireless","menu-simple-lan-config-title":"LAN","menu-simple-services-title":"Services","menu-simple-wan-config-title":"WAN","menu-simple-lan-dhcp-config-title":"DHCP Server","menu-simple-admin-title":"Admin","menu-simple-5g-wireless-title":"5Ghz Wireless","menu-simple-2g-wireless-title":"2Ghz Wireless"});
	gettextCatalog.setStrings('fi', {"Static Address":"","DHCP v4":"DHCP IPv4","DHCP v6":"DHCPv6","PPP over Ethernet":"","wireless.2g.info":" ","2.4Ghz Wireless":"Wifi","Radio Configuration":"Konfiguraatio","SSID Configuration":"Konfiguraatio","wireless.5g.info":" ","5Ghz Wireless":"Wifi","lan.config.info":"","LAN Configuration":"Konfiguraatio","dhcp.config.info":"","DHCP Configuration":"Konfiguraatio","wan.config.info":"","Configuration Method":"Konfiguraatiomenetelmä","Choose Configuration Option":"Valitse Konfiguraatiovaihtoehto","WAN Configuration":"Konfiguraatio","simple-lan-config-title":"Puheluloki","simple-wan-config-title":"Puheluloki","simple-lan-dhcp-config-title":"","simple-5g-wireless-title":"WiFi","simple-2g-wireless-title":"WiFi","menu-simple-lan-config-title":"Puheluloki","menu-simple-wan-config-title":"Puheluloki","menu-simple-lan-dhcp-config-title":"Puheluloki","menu-simple-5g-wireless-title":"WiFi","menu-simple-2g-wireless-title":"WiFi"});
	gettextCatalog.setStrings('sv-SE', {"Static Address":"Statisk IP-adress","DHCP v4":"DHCP server","DHCP v6":"DHCP server","PPP over Ethernet":"PPP över Ethernet","wireless.2g.info":"Här kan du konfigurera din 2Ghz trådlöst nätverk.  ","2.4Ghz Wireless":"2.4Ghz Wireless","Radio Configuration":"Radiokonfiguration","SSID Configuration":"SSID Konfiguration","wireless.5g.info":"Här kan du konfigurera ditt 5Ghz trådlöst nätverk. ","5Ghz Wireless":"5Ghz Trådlöst","lan.config.info":"Här kan du konfigurera ditt LAN nätverk. ","LAN Configuration":"LAN Konfiguration","dhcp.config.info":"DHCP konfiguration","DHCP Configuration":"DHCP Konfiguration","wan.config.info":"WAN konfiguration","Configuration Method":"Konfigurationsmetod","Choose Configuration Option":"Välj konfigurationsväg","WAN Configuration":"WAN konfiguration","simple-lan-config-title":"LAN","simple-services-title":"Tjänster","simple-wan-config-title":"WAN","simple-lan-dhcp-config-title":"DHCP","simple-admin-title":"Admin","simple-5g-wireless-title":"5Ghz WiFi","simple-2g-wireless-title":"2.4Ghz WiFi","menu-simple-lan-config-title":"LAN","menu-simple-services-title":"Tjänster","menu-simple-wan-config-title":"WAN","menu-simple-lan-dhcp-config-title":"DHCP","menu-simple-admin-title":"Admin","menu-simple-5g-wireless-title":"5Ghz WiFi","menu-simple-2g-wireless-title":"2.4Ghz WiFi"});
}]);

JUCI.style({"css":"\n\n\n"});

