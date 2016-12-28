
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

UCI.$registerConfig("dropbear"); 
UCI.dropbear.$registerSectionType("dropbear", {
	//"enable": 				{ dvalue: true, type: Boolean }, //Set to 0 to disable starting dropbear at system boot.
	"verbose": 				{ dvalue: false, type: Boolean }, //Set to 1 to enable verbose output by the start script.
	"BannerFile": 			{ dvalue: "", type: String} , //Name of a file to be printed before the user has authenticated successfully.
	"PasswordAuth": 		{ dvalue: true, type: Boolean }, //Set to 0 to disable authenticating with passwords.
	"Port": 				{ dvalue: 22, type: Number, validator: UCI.validators.PortValidator }, //Port number to listen on.
	"RootPasswordAuth": 	{ dvalue: true, type: Boolean }, //Set to 0 to disable authenticating as root with passwords.
	"RootLogin": 			{ dvalue: true, type: Boolean }, //Set to 0 to disable SSH logins as root.
	"GatewayPorts": 		{ dvalue: false, type: Boolean }, //Set to 1 to allow remote hosts to connect to forwarded ports.
	"Interface": 			{ dvalue: "", type: String }, //Tells dropbear to listen only on the specified interface.1)
	"rsakeyfile": 			{ dvalue: "", type: String }, //Path to RSA file
	"dsskeyfile": 			{ dvalue: "", type: String }, //Path to DSS/DSA file
	"SSHKeepAlive": 		{ dvalue: 300, type: Number }, //Keep Alive
	"IdleTimeout": 			{ dvalue: 0, type: Number } //Idle Timeout 
}); 

/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Stefan Nygren <stefan.nygren@hiq.se>

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
.controller("dropbearSettings", function($scope, $uci, $systemService, dropbearAddKey, $network, $tr, gettext){
	$scope.data = {

	};
	
	$systemService.find("dropbear").done(function(service){
		$scope.service = service;
		$scope.$apply();
	});

	$uci.$sync("dropbear").done(function(){
		$scope.dropbear = []; 
		if($uci.dropbear){
			$scope.dropbear = $uci.dropbear["@dropbear"];
			$scope.$apply();
		}
	});
	
	$scope.getTitle = function(cfg){
		return $tr(gettext("Dropbear Instance on Interface: ")) + ((cfg.Interface.value != "") ? String(cfg.Interface.value).toUpperCase() : $tr(gettext("ANY"))) + " Port: " + cfg.Port.value;
	}

	$scope.onAddInstance = function(){
		$uci.dropbear.$create({
			".type":"dropbear"
		}).done(function() {
			$scope.$apply();
		});
	}
	$scope.onDeleteInstance = function(ins){
		if(!ins) alert($tr(gettext("Please select a instance in the list to remove")));
		if($scope.dropbear.length <= 0) {
			alert($tr(gettext("Unable to remove last instance")));
		} else {
		 	 if(confirm($tr(gettext("Are you sure you want to remove this instance?")))){
				ins.$delete().done(function(){
					$scope.$apply();
				});
		 	}
		}
	}

	$scope.onServiceEnableDisable = function(){
		if(!$scope.service) return;
		if($scope.service.enabled){
			$scope.service.disable().always(function(){ $scope.$apply(); });
		} else {
			$scope.service.enable().always(function(){ $scope.$apply(); });
		}
	}
	$scope.onStartStopService = function(){
		if(!$scope.service) return;
		if($scope.service.running){
			$scope.service.stop().always(function(){ $scope.$apply(); });
		} else {
			$scope.service.start().always(function(){ $scope.$apply(); });
		}
	}
	function refresh(){
		$rpc.juci.dropbear.get_public_keys().done(function(result){
			$scope.keyList = result.keys;
			$scope.$apply();
		}).fail(function(){
			$scope.keyList = [];
		}); 
	}
	refresh(); 

	$scope.onDeleteKey = function(item){
	   $rpc.juci.dropbear.remove_public_key(item).done(function(res){
	  		if(res.error) alert($tr(res.error)); 	
			refresh();
		});
	}

	$scope.onAddKey = function(){
		dropbearAddKey.show().done(function(data){
			$rpc.juci.dropbear.add_public_key(data).done(function(result){
				if(result.error) alert($tr(result.error)); 
				refresh();
			});
		});
	};

	$scope.getItemTitle = function(item){
		if(!item.id || item.id == "") return $tr(gettext("Key ending with"))+" "+item.key.substr(-4); 
		return item.id; 
	}
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
.factory("dropbearAddKey", function($modal, $network){
	return {
		show: function(opts){
			var def = $.Deferred(); 
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'widgets/dropbear-add-key.html',
				controller: 'dropbearAddKeyModel',
				resolve: {
					
				}
			});

			modalInstance.result.then(function (data) {
				setTimeout(function(){ // do this because the callback is called during $apply() cycle
					def.resolve(data); 
				}, 0); 
			}, function () {
				
			});
			return def.promise(); 
		}
	}; 
})
.controller("dropbearAddKeyModel", function($scope, $modalInstance, $tr, gettext){
	$scope.data = {}; 
	$scope.ok = function () {
		if(!$scope.data.key) {
			alert($tr(gettext("You need to insert the public key data!"))); 
			return; 
		}
		$modalInstance.close($scope.data);
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
})

/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Stefan Nygren <stefan.nygren@hiq.se>

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
.directive("dropbearSettingsEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/dropbear-settings-edit.html",
		scope: {
			dropbear: "=ngModel"
		},
		replace: true,
		controller: "dropbearSettingsEdit",
		require: "^ngModel"
	};
}).controller("dropbearSettingsEdit", function($scope, $rpc, $network){
	$network.getNetworks().done(function(res) {
		$scope.interfaces = res.map(function(x) { return {label:x[".name"].toUpperCase(),value:x[".name"]};});
		$scope.interfaces.push({label:"LOOPBACK",value:"loopback"});
		$scope.interfaces.push({label:"ANY",value:""});
		$scope.$apply();
	});
});


angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Key ending with":"","Dropbear Instance ":"","Please select a instance in the list to remove":"","Unable to remove last instance":"","Are you sure you want to remove this instance?":"","You need to insert the public key data!":"","Paste your key here:":"","Add new SSH key":"","Banner File":"","Name of a file to be printed before the user has authenticated successfully":"","Banner File Path":"","Password Authentication":"","Port":"","Listen Port":"Listen Port","Enable Root Password Auth":"","Enable Root Login":"","Enable Forwarded Ports":"","Interface":"Interface","ANY":"","RSA Key File":"","DSS Key File":"","Connection Keep Alive":"","Idle Timeout":"","Authorized SSH keys":"","Dropbear SSH":"","General settings":"","Start/Stop Service":"","Start or stop service":"","Enabled":"","Enable/Disable starting SSH service during boot":"","Verbose logging":"","Set to 1 to enable verbose output by the start script":"","Dropbear Instances":"","settings.dropbear.instance":"Configure settings for multiple instances of SSH server. ","settings-management-dropbear-title":"SSH (dropbear)","dropbear-authorized-keys-title":"SSH Keys","menu-settings-management-dropbear-title":"SSH","menu-dropbear-authorized-keys-title":"SSH Keys"});
	gettextCatalog.setStrings('fi', {"Dropbear SSH":"Dropbear SSH","settings.dropbear.info":"Konfiguroi SSH-pääsy modeemiin.","Start/Stop Service":"Käynnistä/Pysäytä","Start or stop service":"Käynnistä tai pysäytä palvelu","Enabled":"Käytössä","Enable/Disable starting SSH service during boot":"Ota käyttöön / poista käytöstä SSH-palvelu käynnistyksen aikana","Verbose logging":"Kattava lokitus","Set to 1 to enable verbose output by the start script":"Asetettu 1, joka ottaa käyttöön kattavan lokituksen","Banner File":"Banner tiedosto","Name of a file to be printed before the user has authenticated successfully":"Tiedoston nimi tulostetaan ennen kuin käyttäjä on todennettu onnistuneesti","Banner File Path":"Bannerin tiedostopolku","Password Authentication":"Salasanan tunnistus","Port":"Portti","Listen Port":"Kuuntelu portti","Enable Root Password Auth":"Salli root salasana todennus","Enable Root Login":"Salli Root-käyttäjän Kirjautuminen","Enable Forwarded Ports":"Enable Forwarded Ports","Interface":"Fyysinen liitäntä","RSA Key File":"RSA Key File","DSS Key File":"DSS Key File","Connection Keep Alive":"Yhteyksien elossapito","Idle Timeout":"Aikakatkaisu","settings-management-dropbear-title":"SSH","menu-settings-management-dropbear-title":"SSH"});
	gettextCatalog.setStrings('sv-SE', {"Dropbear SSH":"SSH","settings.dropbear.info":"Inställningar för SSH-åtkomst till din router","Start/Stop Service":"Starta/Stoppa tjänsten","Start or stop service":"Starta eller stoppa tjänsten","Enabled":"Aktiv","Enable/Disable starting SSH service during boot":"Slå på/av SSH tjänsten","Verbose logging":"Utförlig loggning","Set to 1 to enable verbose output by the start script":"Sätt till 1 för att slå på extra logginformation","Banner File":"Banner-fil","Name of a file to be printed before the user has authenticated successfully":"Namn på filen som ska användas som banner när användaren loggar in","Banner File Path":"Banner-filens sökväg","Password Authentication":"Lösenordsautentisering","Port":"Port","Listen Port":"Port","Enable Root Password Auth":"Tillåt inloggning med lösenord för root","Enable Root Login":"Tillåt inloggning för root","Enable Forwarded Ports":"Slå på port-forwarding funktionalitet","Interface":"Interface","RSA Key File":"RSA nyckelfil","DSS Key File":"DNS nyckelfil","Connection Keep Alive":"Keep-Alive funktion","Idle Timeout":"Timeout inaktivitet","settings-management-dropbear-title":"SSH","menu-settings-management-dropbear-title":"SSH"});
}]);

