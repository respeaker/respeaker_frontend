
;(jQuery && jQuery.fn.upload) || (function( $) {
		// abort if xhr progress is not supported
	if( !($.support.ajaxProgress = ("onprogress" in $.ajaxSettings.xhr()))) {
		return;
	}

	var _ajax = $.ajax;
	$.ajax = function ajax( url, options) {
			// If url is an object, simulate pre-1.5 signature
		if ( typeof( url) === "object" ) {
			options = url;
			url = options.url;
		}

			// Force options to be an object
		options = options || {};

		var deferred = $.Deferred();
		var _xhr = options.xhr || $.ajaxSettings.xhr;
		var jqXHR;
		options.xhr = function() {
				// Reference to the extended options object
			var options = this;
			var xhr = _xhr.call( $.ajaxSettings);
			if( xhr) {
				var progressListener = function( /*true | false*/upload) {
					return function( event) {
						/*
						 * trigger the global event.
						 * function handler( jqEvent, progressEvent, upload, jqXHR) {}
						 */
						options.global && $.event.trigger( "ajaxProgress", [ event, upload, jqXHR]);

							/*
							 * trigger the local event.
							 * function handler(jqXHR, progressEvent, upload)
							 */
						$.isFunction( options.progress) && options.progress( jqXHR, event, upload);

						deferred.notifyWith( jqXHR, [event, upload]);
					};
				};

				xhr.upload.addEventListener( "progress", progressListener( true), false);
				xhr.addEventListener( "progress", progressListener( false), false);
			}
			return xhr;
		};

		jqXHR = _ajax.call( this, url, options);

			// delegate all jqXHR promise methods to our deferred
		for( var method in deferred.promise()) {
			jqXHR[ method]( deferred[ method]);
		}
		jqXHR.progress = deferred.progress;

			// overwrite the jqXHR promise methods with our promise and return the patched jqXHR
		return jqXHR;
	};

		/**
		 * jQuery.upload( url [, data] [, success(data, textStatus, jqXHR)] [, dataType] )
		 *
		 * @param url
		 *         A string containing the URL to which the request is sent.
		 * @param data
		 *         A map or string that is sent to the server with the request.
		 * @param success(data, textStatus, jqXHR)
		 *         A callback function that is executed if the request succeeds.
		 * @param dataType
		 *         The type of data expected from the server. Default: Intelligent Guess (xml, json, script, text, html).
		 *
		 * This is a shorthand Ajax function, which is equivalent to:
		 * .ajax({
		 *		processData	: false,
		 *		contentType	: false,
		 *		type		: 'POST',
		 *		url			: url,
		 *		data		: data,
		 *		success		: callback,
		 *		dataType	: type
		 *	});
		 *
		 * @return jqXHR
		 */
	$.upload = function( url, data, callback, type) {
			// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return $.ajax({
			/*
			 * processData and contentType must be false to prevent jQuery
			 * setting its own defaults ... which would result in nonsense
			 */
			processData	: false,
			contentType	: false,
			type		: 'POST',
			url			: url,
			data		: data,
			success		: callback,
			dataType	: type
		});
	};
})( jQuery);

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

JUCI.app.run(function($uci, $rpc, $tr, gettext, upgradePopup){
	var upgrades = []; 
	
	async.series([
		function(next){
			$uci.$sync("system").done(function(){
				if(!$uci.system.upgrade) {
					$uci.system.$create({ ".type": "upgrade", ".name": "upgrade" }).done(function(section){
						$uci.$save().done(function(){
							console.log("Created missing section system.upgrade in UCI!"); 
							next(); 
						}); 
					}); 
				} else {
					next(); 
				}
			}); 
		}, 
		function(next){
			$rpc.juci.system.upgrade.check().done(function(response){
				if(response.all && response.all.length) {
					/*upgradePopup.show({ images: response.all.map(function(x){ return { label: x, value: x }; }) }).done(function(selected){
						$rpc
					}); */
					if(confirm($tr(gettext("A new system software upgrade is available. Do you want to visit upgrade page and upgrade now?")))) {
						window.location.href = "/#!/settings-upgrade"; 
					}
				} 
				next(); 
			}); 
		}
	], function(){
		
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
.controller("SettingsUpgradeOptions", function($scope, $uci, $rpc, $tr, gettext){
	$scope.allImageExtensions = [
		{ label: $tr(gettext(".w (JFFS Image)")), value: ".w" },
		{ label: $tr(gettext(".y (UBIFS Image)")), value: ".y" }, 
		{ label: $tr(gettext("fs_image (RAW Rootfs Image)")), value: "fs_image" }
	]; 
	
	$uci.$sync("system").done(function(){
		$scope.system = $uci.system; 
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
.controller("SettingsUpgradeCtrl", function($scope, $uci, $config, $rpc, $tr, gettext){
	$scope.sessionID = $rpc.$sid();
	$scope.uploadFilename = "/tmp/firmware.bin";
	$scope.uploadProgress = 0; 
	$scope.usbFileName = "()"; 
	$scope.usbUpgradeAvailable = false;  
	$scope.state = 'INIT'; 

	$scope.data = { keepSettings: true }; 
	$scope.current_version = $config.board.release.distribution + " " + $config.board.release.version; 
	
	$scope.keepSettingsList = [
		{ label: $tr(gettext("Keep all configuration")), value: true }, 
		{ label: $tr(gettext("Reset all configuration")), value: false }
	]; 

	$uci.$sync("system").done(function(){
		$scope.system = $uci.system; 
		$scope.$apply(); 
	}); 
	
	$rpc.system.board().done(function(info){
		$scope.board = info; 
		$scope.$apply(); 
	}); 

	function clearFileInputs(){
		angular.forEach(angular.element("input[type='file']"), function(e){
			angular.element(e).val(null); 
		}); 
	}

	$scope.onStartUpgrade = function(){
		$scope.state = 'UPGRADING'; 
		var timeout; 
		$rpc.juci.system.upgrade.start({"path": $scope.uploadPath, "keep": (($scope.keepSettings)?1:0)}).fail(function(){
			clearTimeout(timeout); 
			$scope.state = 'FAILED'; 
			$scope.$apply(); 
		}); 
		// NOTE: we are not using done() here because the start upgrade call may actually fail if server is killed
		// Instead we use a timeout and redirect to reboot page after a short while. {
		timeout = setTimeout(function(){
			window.location.href="/reboot.html"; 
		}, 2000); 
	}

	$scope.onCancelUpload = function(){
		$scope.state = 'INIT'; 
		$scope.uploadProgress = 0; 
		clearFileInputs(); 	
	}

	function upgradeVerify(){
		$scope.state = 'VERIFYING'; 
		$rpc.juci.system.upgrade.test({"path": $scope.uploadFilename}).done(function(result){
			$scope.imageExists = result.exists; 
			if(result && result.error) {
				$scope.imageError = $tr(gettext("Image check failed:"))+result.stdout; 
				$scope.state = 'FAILED'; 
				$scope.$apply(); 
				return; 
			} 
			if(result.exists) $scope.state = 'VERIFIED'; 
			else $scope.state = 'INIT'; 
		}).fail(function(){
			$scope.state = 'FAILED'; 
		}).always(function(){
			$scope.$apply();
		}); 
	} upgradeVerify(); 

	$scope.onSelectFile = function(ev){
		var input = ev.target; 
		
		var reader = new FileReader(); 
		$scope.state = 'UPLOADING'; 
		reader.onload = function(){
			var buffer = reader.result; 
			var start = 0; 
			var slice = 10000; 
			var slices = 0; 
			var time = (new Date()).getTime(); 

			function tobase64(arrayBuffer){
				return window.btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
			}

			console.log("uploading file of size "+buffer.byteLength); 
			function doSpeedCalc(){
				setTimeout(function(){
					$scope.uploadSpeed = Math.round((slices * slice) / 1000) / 1000; 
					slices = 0; 
					if($scope.state == 'UPLOADING') doSpeedCalc(); 
				}, 1000); 
			} doSpeedCalc(); 
			function next(){
				if((start + slice) > buffer.byteLength) slice = buffer.byteLength - start; 
				$rpc.file.write({
					filename: "/tmp/firmware.bin",
					seek: start, 
					length: slice, 
					data64: tobase64(buffer.slice(start, start + slice))
				}).done(function(){
					if($scope.state != 'UPLOADING') return; 
					start += slice; 
					if(start >= buffer.byteLength){
						console.log("File uploaded!"); 
						$scope.state = 'UPLOADED'; 
						$scope.uploadProgress = 0; 
						clearFileInputs(); 
						upgradeVerify(); 
						$scope.$apply(); 
					} else {
						slices++; 
						setTimeout(function(){ 
							$scope.uploadProgress = Math.round((start / buffer.byteLength) * 100); 
							$scope.$apply(); 
							if($scope.state == 'UPLOADING') next(); 
						}, 0); 
					}
				}).fail(function(){
					console.error("File upload failed!"); 
					$scope.state = 'FAILED'; 
					$scope.$apply(); 
				}); 
			} next(); 
		}
		try {
			reader.readAsArrayBuffer(input.files[0]); 
		} catch(e){
			$scope.state = 'INIT'; 
		}
	}
	
	$scope.onCheckOnline = function(){
		$scope.onlineUpgradeAvailable = false;
		$scope.onlineCheckInProgress = 1; 
		$rpc.juci.system.upgrade.check({type: "online"}).done(function(response){
			if(response.online) {
				$scope.onlineUpgrade = response.online; 
				$scope.onlineUpgradeAvailable = true;
			} else {
				$scope.onlineUpgrade = $tr(gettext("No upgrade has been found!")); 
			}
			if(response.stderr) $scope.$emit("error", $tr(gettext("Online upgrade check failed"))+": "+response.stderr); 
			$scope.onlineCheckInProgress = 0; 
			$scope.$apply(); 
		}); 
	} 
	$scope.onUpgradeOnline = function(){
		confirmKeep().done(function(keep){
			upgradeStart($scope.onlineUpgrade, keep); 
		}); 
	}
	
	$scope.onCheckUSB = function(){
		$scope.usbUpgradeAvailable = false;
		$scope.usbCheckInProgress = 1; 
		$rpc.juci.system.upgrade.check({type: "usb"}).done(function(response){
			if(response.usb) {
				$scope.usbUpgrade = response.usb; 
				$scope.usbUpgradeAvailable = true;
			} else {
				$scope.usbUpgrade = $tr(gettext("No upgrade has been found!")); 
			}
			if(response.stderr) $scope.$emit("error", $tr(gettext("USB upgrade check failed"))+": "+response.stderr); 
			$scope.usbCheckInProgress = 0; 
			$scope.$apply(); 
		});
	}
	$scope.onUpgradeUSB = function(){
		confirmKeep().done(function(keep){
			upgradeStart($scope.usbUpgrade, keep); 
		}); 
	}
	
	$scope.onCheckUSB(); 
	$scope.onCheckOnline(); 
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
.factory("upgradePopup", function($modal, $network){
	return {
		show: function(opts){
			var def = $.Deferred(); 
			var exclude = {}; // allready added nets that will be excluded from the list
			if(!opts) opts = {}; 
			
			var modalInstance = $modal.open({
				animation: true,
				backdrop: "static", 
				templateUrl: 'widgets/upgrade.popup.html',
				controller: 'upgradePopup',
				resolve: {
					images: function () {
						return opts.images || []; 
					}
				}
			});

			modalInstance.result.then(function (data) {
				setTimeout(function(){ // do this because the callback is called during $apply() cycle
					def.resolve(data); 
				}, 0); 
			}, function () {
				console.log('Modal dismissed at: ' + new Date());
			});
			return def.promise(); 
		}
	}; 
})
.controller("upgradePopup", function($scope, $modalInstance, images, gettext){
	$scope.images = images; 
	$scope.data = {}; 
  $scope.ok = function () {
		if(!$scope.data.selected) {
			alert(gettext("You need to select a network!")); 
			return; 
		}
		$modalInstance.close($scope.data.selected);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
})

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"A new system software upgrade is available. Do you want to visit upgrade page and upgrade now?":"","Verifying firmware image":"","Upgrade process has started. The web gui will not be available until the upgrade process has completed!":"","No upgrade has been found!":"",".w (JFFS Image)":"",".y (UBIFS Image)":"","fs_image (RAW Rootfs Image)":"","You need to select a network!":"","Pick image to upgrade":"","New software is available":"","Firmware Upgrade":"","settings.upgrade.info":"Here you can upgrade the software on your router.","Current Firmware Version":"","Online Update":"","settings.upgrade.online.info":"Click \"Check for Update\" to start an online software upgrade. If a newer firmware is found, it will be automatically installed on your router (Internet connection required).","Check for Upgrade":"","Install Upgrade":"","USB Firmware Upgrade":"","settings.upgrade.usb.info":"It is possible to update the firmware from a file saved on a USB storage attached to the USB port of your router. Click \"Install Update\" to start the automatic firmware upgrade. Please note that there should be only one firmware file on the storage and that one shall be located under the main directory (no search under subfolders).","Manual Firmware Upgrade":"","settings.upgrade.manual.info":"It is possible to update the firmware from a saved update file.","Pick firmware file to upload":"","Start upgrade":"","Upgrade":"","Online upgrade is disabled":"","USB upgrade is disabled":"","If you answer yes then your confiruation will be saved before the upgrade and restored after the upgrade has completed. If you choose 'no' then all your current confiration will be reset to defaults.":"","Close":"","Upgrade Options":"","settings.upgrade.options.info":"Configure system upgrade options. ","URL for file with latest image filename":"","URL":"","Upgrade URL base path":"","HTTP Directory":"","Firmware image extension":"","Online Upgrade":"","USB Upgrade":"","settings-upgrade-options-title":"System Upgrade Options","settings-upgrade-title":"Firmware Upgrade","menu-settings-upgrade-options-title":"Options","menu-settings-upgrade-title":"Firmware Upgrade"});
	gettextCatalog.setStrings('fi', {"A new system software upgrade is available. Do you want to visit upgrade page and upgrade now?":"Ohjelmistopäivitys on saatavilla. Haluatko avata päivityssivun ja päivittää nyt?","Verifying firmware image":"Tarkistetaan ohjelmistoa","Upgrade process has started. The web gui will not be available until the upgrade process has completed!":"Päivitys on alkanut. Web-hallinta ei ole käytettävissä ennen kuin päivitys on valmis!","No upgrade has been found!":"Päivitystä ei saatavilla!",".w (JFFS Image)":".w (JFFS Image)",".y (UBIFS Image)":".y (UBIFS Image)","fs_image (RAW Rootfs Image)":"fs_image (RAW Rootfs Image)","You need to select a network!":"Valitse verkko!","Pick image to upgrade":"Valitse päivitystiedosto","New software is available":"Uusi ohjelmisto on saatavilla","Firmware Upgrade":"Ohjelmistopäivitys","settings.upgrade.info":"Modeemi päivittää automaattisesti viimeisimmän saatavilla olevan ohjelmiston. On myös mahdollista päivittää modeemin ohjelmisto manuaalisesti mikäli se on välttämätöntä. Päivittäminen ei vaikuta nykyisiin asetuksiin.","Current Firmware Version":"Nykyinen ohjelmistoversio","Online Update":"Verkkopäivitys","settings.upgrade.online.info":"Online päivitys","Check for Upgrade":"Tarkista päivitykset","Install Upgrade":"Asenna päivitys","USB Firmware Upgrade":"USB päivitys","settings.upgrade.usb.info":"USB päivitys","Manual Firmware Upgrade":"Manuaalinen ohjelmistopäivitys","settings.upgrade.manual.info":"Manuaalinen päivitys","Pick firmware file to upload":"Valitse ladattava ohjelmisto","Start upgrade":"Aloita päivitys","Upgrade":"Päivitä","Online upgrade is disabled":"Online päivitys poissa käytöstä","USB upgrade is disabled":"USB päivitys poissa käytöstä","If you answer yes then your confiruation will be saved before the upgrade and restored after the upgrade has completed. If you choose 'no' then all your current confiration will be reset to defaults.":"Jos valitset \"Kyllä\", asetuksesi säilytetään. Jos valitset \"Ei\", asetukset palautetaan tehdasasetuksille.","Close":"Sulje","Upgrade Options":"Tarkista päivitykset","settings.upgrade.options.info":"Valinnat","URL for file with latest image filename":"Uusimman ohjelmiston URL","URL":"URL","Upgrade URL base path":"Päivitysosoitteen polku","HTTP Directory":"HTTP kansio","Firmware image extension":"Firmware image extension","Online Upgrade":"Online päivitys","USB Upgrade":"USB päivitys","settings-upgrade-options-title":"Valinnat","settings-upgrade-title":"Päivitä","menu-settings-upgrade-options-title":"Valinnat","menu-settings-upgrade-title":"Päivitä"});
	gettextCatalog.setStrings('sv-SE', {"A new system software upgrade is available. Do you want to visit upgrade page and upgrade now?":"Nytt version av mjukvaran är tillgänglig. Vill du uppgradera nu? ","Verifying firmware image":"Verifierar firmwarefil","Upgrade process has started. The web gui will not be available until the upgrade process has completed!":"Uppgraderingen påbörjad. Webbgränssnittet otillgängligt tills dess att uppgraderingen är genomförd!","No upgrade has been found!":"Ingen uppgradering hittades",".w (JFFS Image)":"",".y (UBIFS Image)":"","fs_image (RAW Rootfs Image)":"","You need to select a network!":"Du måste välja ett nätverk!","Pick image to upgrade":"Välj firmware för uppladdning","New software is available":"Ny uppgradering finns tillgänglig!","Firmware Upgrade":"Uppgradering","settings.upgrade.info":"Här kan du uppdatera programvaran på din EasyBox. Om det behövs, är det möjligt att uppdatera Easybox inbyggda programvaran manuellt. Dina nuvarande inställningar kommer inte att påverkas av programvara uppgradering förfarande.","Current Firmware Version":"Nuvarande mjukvaruversion","Online Update":"Online-uppgradering","settings.upgrade.online.info":"Klicka på \"Sök efter uppdatering\" för att starta en online-programvaruuppgradering. Om en ny firmware finns, kommer det att installeras automatiskt på din EasyBox (Internet-anslutning krävs).","Check for Upgrade":"Sök efter uppdatering","Install Upgrade":"Installera uppgradering","USB Firmware Upgrade":"USB Uppgradering","settings.upgrade.usb.info":"Det är möjligt att uppdatera firmware från en fil som sparats på ett USB-minne ansluten till USB-porten på din EasyBox. Klicka på \"Install Update\" för att starta uppgraderingen av automatiska firmware. Observera att det bör finnas en enda firmware-fil att den bör vara placerad under huvudkatalogen (ingen sökning i undermappar).","Manual Firmware Upgrade":"Manuell uppgradering","settings.upgrade.manual.info":"Det är möjligt att uppdatera firmware från fil en sparad uppdatering. Den senaste versionen kan hittas på www.dsl-easybox.de.","Pick firmware file to upload":"Välj firmware för uppladdning","Start upgrade":"Påbörja uppgradering","Upgrade":"Uppgradera","Online upgrade is disabled":"Online uppgradering är avaktiverad. ","USB upgrade is disabled":"USB uppgradering är avaktiverad. ","If you answer yes then your confiruation will be saved before the upgrade and restored after the upgrade has completed. If you choose 'no' then all your current confiration will be reset to defaults.":"Om du svarar ja så kommer dina inställningar att bevaras under uppgraderingen. ","Close":"Stäng","Upgrade Options":"Uppgraderingsalternativ","settings.upgrade.options.info":"Här kan du uppgradera mjukvaran på boxen till senaste versionen","URL for file with latest image filename":"URL för filen som innehåller sökvägen till senaste upgrade","URL":"URL","Upgrade URL base path":"Bas-URL för uppgraderingen","HTTP Directory":"HTTP mapp","Firmware image extension":"Firmware filtyp","Online Upgrade":"Online-uppgradering","USB Upgrade":"USB uppgradering","settings-upgrade-options-title":"Uppgradera","settings-upgrade-title":"Uppgradera","menu-settings-upgrade-options-title":"Uppgradera","menu-settings-upgrade-title":"Uppgradera"});
}]);

