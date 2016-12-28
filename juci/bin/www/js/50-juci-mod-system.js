
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

UCI.$registerConfig("system"); 

UCI.system.$registerSectionType("system", {
	"hostname":		{ dvalue: '', type: String },
	"timezone":		{ dvalue: '', type: String },
	"zonename":		{ dvalue: '', type: String },
	"conloglevel":		{ dvalue: 7, type: Number },
	"cronloglevel":		{ dvalue: 5, type: Number },
	"log_size":		{ dvalue: 16, type: Number },
	"log_file": 	{ dvalue: "", type: String },
	"log_ip": 		{ dvalue: "", type: String, validator: UCI.validators.IPAddressValidator },
	"log_port": 	{ dvalue: undefined, type: Number },
	"log_prefix": 	{ dvalue: "", type: String }, 
	"log_remote": 	{ dvalue: false, type: Boolean }
}, function(sec){
	if(sec.log_ip.value == "0.0.0.0") return gettext("Log IP is invalid"); 
}); 

UCI.system.$registerSectionType("timeserver", {
	"enable_server": { dvalue: false, type: Boolean }, 
	"server": { dvalue: [], type: Array }
}); 

UCI.system.$registerSectionType("upgrade", {
	"fw_check_url":		{ dvalue: "", type: String, required: false},
	"fw_path_url":		{ dvalue: "", type: String },
	"fw_usb_path": 		{ dvalue: "", type: String }, 
	"fw_find_ext":		{ dvalue: "", type: String, required: false},
	"fw_upload_path":	{ dvalue: "", type: String, required: false}
}); 

JUCI.app.factory("$systemService", function($rpc){
	return {
		list: function(){
			var def = $.Deferred(); 
			var self = this; 
			$rpc.juci.system.service.list().done(function(result){
				if(result && result.services){
					var result = result.services.map(function(service){
						service.enable = function(){
							var self = this; 
							console.log("enabling service "+self.name); 
							return $rpc.juci.system.service.enable({ name: self.name }).done(function(){ self.enabled = true; }); 
						}
						service.disable = function(){
							var self = this; 
							console.log("disabling service "+self.name); 
							return $rpc.juci.system.service.disable({ name: self.name }).done(function(){ self.enabled = false; });
						}
						service.start = function(){
							var self = this; 
							console.log("starting service "+self.name); 
							return $rpc.juci.system.service.start({ name: self.name }).done(function(){ self.running = true; }); 
						}
						service.stop = function(){
							var self = this; 
							console.log("stopping service "+self.name); 
							return $rpc.juci.system.service.stop({ name: self.name }).done(function(){ self.running = false; }); 
						}
						service.reload = function(){
							var self = this; 
							return $rpc.juci.system.service.reload({ name: self.name }); 
						}
						return service;	
					}); 
					def.resolve(result); 
				} else {
					def.reject(); 
				}
			}).fail(function(){ def.reject(); }); 
			return def.promise(); 
		},
		find: function(name){
			var def = $.Deferred(); 
			this.list().done(function(services){
				if(services) {
					var s = services.find(function(x){ return x.name == name; }); 
					if(s)
						def.resolve(s); 
					else
						def.reject(); 
				} else {
					def.reject(); 
				}
			}).fail(function(){ def.reject(); }); 
			return def.promise(); 
		}
	}; 
}); 

/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Reidar Cederqvist <reidar.cederqvist@gmail.com>

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
.controller("InternetServicesNTPPage", function($scope, $rpc, $uci, $tr, gettext){

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
.controller("SettingsConfigurationCtrl", function($scope, $upload, $rpc, $tr, gettext){
	$scope.sessionID = $rpc.$sid(); 
	$scope.resetPossible = 0; 
	$scope.resetPossible = 1; 

	$rpc.juci.system.conf.features().done(function(features){
		$scope.features = features; 
		$scope.$apply(); 
	}); 

	$scope.onReset = function(){
		if(confirm(gettext("This will reset your configuration to factory defaults. Do you want to continue?"))){
			$rpc.juci.system.defaultreset().done(function(result){
				console.log("Performing reset: "+JSON.stringify(result)); 
				window.location = "/reboot.html";  
			}); 
		}
	}
	$scope.onSaveConfig = function(){
		$scope.data.pass = $scope.data.pass_repeat = ""; 
		$scope.showModal = 1; 
	}

	$scope.onRestoreConfig = function(){
		$scope.data.pass = $scope.data.pass_repeat = ""; 
		$scope.showUploadModal = 1; 
	}
	$scope.onCancelRestore = function(){
		$scope.showUploadModal = 0; 
	}
	$scope.data = {}; 
	/*setInterval(function checkUpload(){
		var iframe = $("#postiframe").load(function(){; 
		var json = iframe.contents().text();
		try {
			if(json.length && JSON.parse(json)) {
				$scope.onUploadComplete(JSON.parse(json)); 
			} 
		} catch(e){}
		iframe.each(function(e){$(e).contents().html("<html>");}); ; 
	}, 500); */
	$scope.onUploadFileChanged = function(file){
		$scope.uploadFile = file; 
	} 
	$scope.onUploadConfig = function(){
		$upload.$write("/tmp/backup.tar.gz", $scope.uploadFile).done(function(){
			$rpc.juci.system.conf.restore({
				pass: $scope.data.pass
			}).done(function(result){
				if(result.error){
					alert(result.error); 
				} else {
					$scope.$apply(); 
					if(confirm($tr(gettext("Configuration has been restored. You need to reboot the device for settings to take effect! Do you want to reboot now?")))){
						$rpc.juci.system.reboot(); 
					}
				}
			}).fail(function(err){
				console.error("Failed: "+JSON.stringify(err)); 
			}).always(function(){
				$scope.data = {}; 
				$scope.$apply(); 
			}); 
		}).fail(function(){
			alert($tr(gettext("File upload failed!"))); 
		}); 
	}

	$scope.onAcceptModal = function(){
		if($scope.data.pass != $scope.data.pass_repeat) {
			alert($tr(gettext("Passwords do not match!"))); 
			return; 
		}
		if($scope.data.pass == undefined || $scope.data.pass_repeat == undefined){
			if(!confirm($tr(gettext("Are you sure you want to save backup without password?")))) return; 
		}
		$rpc.juci.system.conf.backup({password: $scope.data.pass}).done(function(result){
			if(result.id) window.open(window.location.origin+"/cgi-bin/juci-download?id="+result.id); 
		}); 
		$scope.data = {}; 
		$scope.showModal = 0; 
	}
	$scope.onDismissModal = function(){
		$scope.showModal = 0; 
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
.controller("SettingsEnergyCtrl", function($scope, $uci){
	$uci.$sync(["boardpanel"]).done(function(){
		if($uci.boardpanel)
			$scope.boardpanel = $uci.boardpanel; 
		$scope.$apply();
	}); 
	$scope.onSave = function(){
		$uci.$save(); 
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
.controller("SettingsManagementPage", function($scope, $uci){

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
.controller("settingsPasswordPage", function($scope, $rpc, $tr, gettext){
	$scope.showPassword = 0; 
	$scope.showModal = 0; 

	$scope.modal = {
		username: $rpc.$session.username,
		old_password: "", 
		password: "", 
		password2: ""
	}; 
	$scope.passwordStrength = 1; 
	
	$rpc.juci.system.user.listusers({ sid: $rpc.$sid() }).done(function(result){
		$scope.allUsers = result.users.map(function(x){
			return { label: x, value: x }; 
		}); 
		$scope.$apply(); 
	}); 

	function measureStrength(p) {
		var strongRegex = new RegExp("^(?=.{8,})(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*\\W).*$", "g");
		var mediumRegex = new RegExp("^(?=.{7,})(((?=.*[A-Z])(?=.*[a-z]))|((?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[0-9]))).*$", "g");
		var enoughRegex = new RegExp("(?=.{4,}).*", "g");
		 
		if(strongRegex.test(p)) return 3; 
		if(mediumRegex.test(p)) return 2; 
		if(enoughRegex.test(p)) return 1; 
		return 0; 
	}
	
	$scope.$watch("modal", function onSystemPasswordModalChanged(){
		$scope.passwordStrength = measureStrength($scope.modal.password); 
	}, true); 
	
	$scope.$watch("modal.username", function onSystemPasswordUsernameChanged(value){
		if(value == undefined) return; 
		$scope.username = value; 
	}); 

	$scope.onChangePasswordClick = function(){
		$scope.modal = { username: $scope.username }; 
		$scope.showModal = 1; 
	}

	$scope.onAcceptModal = function(){
		$scope.error = ""; 
		if($scope.modal.password != $scope.modal.password2) alert($tr(gettext("Passwords do not match!"))); 
		else {
			// TODO: change to correct username
			$rpc.juci.system.user.setpassword({sid: $rpc.$sid(), username: $scope.username, password: $scope.modal.password, oldpassword: $scope.modal.old_password}).done(function(data){
				if(data.error){
					alert(data.error); 
				} else {
					$scope.showModal = 0; 
					$scope.$apply(); 
				}
				//$rpc.$logout().done(function(){
				//	window.location.reload(); 
				//}); 
			}).fail(function(response){
				$scope.error = gettext("Was unable to set password. Please make sure you have entered correct current password!"); 
				$scope.$apply(); 
			}); 
		}
	}
	$scope.onDismissModal = function(){
		$scope.showModal = 0; 
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
.controller("ServicesStatusPage", function($scope, $rpc, gettext){
	JUCI.interval.repeat("juci-services-page", 5000, function(done){
		$rpc.juci.system.service.list().done(function(result){
			$scope.services = result.services; 
			$scope.services.map(function(service){
				service.reload = false;
				if(!service.start_priority){
					service.start_priority = 9999;
				}
			}); 
			$scope.services.sort(function(a,b){
				return a.start_priority - b.start_priority;
			});
			$scope.$apply();
			done(); 
		});
	}); 

	$scope.onServiceEnable = function(service){
		if(service.enabled){
			$rpc.juci.system.service.disable(service).done(function(result){
				console.log("service: " + service.name + " is disabled");
				$scope.$apply(); 
			});	
		} else {
			$rpc.juci.system.service.enable(service).done(function(result){
				console.log("service: " + service.name + " is enabled");
				$scope.$apply();
			});
		}
	}
	
	$scope.onServiceReload = function(service){
		service.reload = true;
		$rpc.juci.system.service.reload(service).done(function(result){
			console.log("service: " + service.name + " is reloded");
			service.reload = false;
			$scope.$apply();
		});
	}

	$scope.onServiceToggle = function(service){
		if(service.running){
			$rpc.juci.system.service.stop(service).done(function(result){
				service.running = true;
				console.log("service: " + service.name + " is stoped");
				$scope.$apply(); 
			});	
		} else {
			$rpc.juci.system.service.start(service).done(function(result){
				service.running = false;
				console.log("service: " + service.name + " is started");
				$scope.$apply();
			});
		}
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
.controller("SettingsSystemGeneral", function($scope, $rpc, $uci, $tr, gettext){
	async.series([
		function(next){
			$uci.$sync("system").done(function(){
				if($uci.system["@system"] && $uci.system["@system"].length)
					$scope.system = $uci.system["@system"][0]; 
				next(); 
			}); 
		}, 
		function(next){
			$rpc.system.board().done(function(values){
				$scope.boardinfo = values; 
			}).always(function(){next();}); 
		}, 
		function(next){
			$rpc.juci.system.time.zonelist().done(function(result){
				if(result && result.zones){
					$scope.timezones = result.zones; 
					$scope.allTimeZones = Object.keys(result.zones).sort().map(function(k){
						return { label: k, value: k.trim() }; 
					}); 
					$scope.$apply();
				}
				next(); 
			}); 
		}
	], function(){
		$scope.loaded = true; 
		$scope.$apply(); 
	}); 
	
	$scope.$watch("system.zonename.value", function onSystemZonenameChanged(value){
		if(!value || !$scope.timezones) return; 
		$scope.system.timezone.value = $scope.timezones[value]; 
	}); 

	JUCI.interval.repeat("system.time", 1000, function(done){
		$rpc.juci.system.time.get().done(function(result){
			$scope.localtime = result.local_time; 
			$scope.$apply(); 
			done(); 
		}); 
	}); 
	
	$scope.setRouterTimeToBrowserTime = function(){
		$scope.state = 'SETTING_TIME'; 
		$rpc.juci.system.time.set({ unix_time: Math.floor((new Date()).getTime() / 1000) }).done(function(){
				
		}).always(function(){
			$scope.state = 'IDLE'; 
			$scope.$apply(); 
		}); 
	}; 
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
.controller("SettingsUCIController", function($scope, $rpc){
	var configs = {}; 
	$scope.loading = 0; 
	function filterHiddenValues(values){
		var ret = {}; 
		Object.keys(values).map(function(v){
			if(v.indexOf(".") != 0) ret[v] = values[v]; 
		}); 
		return ret; 
	}
	$scope.onChangeSection = function(item){
		$scope.selectedConfig = item; 
		$scope.error = ""; 
		$scope.loading = 1; 
		$scope.subsections = {}; 
		$rpc.uci.state({
			config: item.id
		}).done(function(data){
			$scope.subsections = data.values; 
			Object.keys($scope.subsections).map(function(k){
				$scope.subsections[k] = filterHiddenValues($scope.subsections[k]); 
			}); 
			$scope.loading = 0; 
			$scope.$apply(); 
		}).fail(function(err){
			$scope.error = "Could not retreive data!"; 
			$scope.loading = 0; 
			$scope.$apply(); 
		});  
	}
	$scope.onSaveSection = function(id){
		if(!$scope.selectedConfig) return; 
		$scope.error = ""; 
		$rpc.uci.set({
			"config": $scope.selectedConfig.id, 
			"section": id, 
			"values": $scope.subsections[id]
		}).done(function(resp){
			$rpc.uci.commit({
				config: $scope.selectedConfig.id
			}).done(function(resp){
				$scope.onResetSection(id); 
			}); 
		}); 
	}
	$scope.onResetSection = function(id){
		$scope.error = ""; 
		if(!$scope.selectedConfig) return; 
		$rpc.uci.state({
			config: $scope.selectedConfig.id, 
			section: id
		}).done(function(result){
			Object.assign($scope.subsections[id], filterHiddenValues(result.values)); 
			$scope.$apply(); 
		}); 
	}
	async.series([
		function(next){ $rpc.uci.configs().done(function(list){configs = list.configs; next(); }); }
	], function(){
		$scope.error = ""; 
		$scope.sections = configs.map(function(x){return {label: x, id: x};}); 
		$scope.$apply(); 
	})
	/*$rpc.uci.state({
		config: "wireless"
	}).done(function(data){
		Object.keys(data.values).map(function(k){
			
		}); 
	}); */
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
.controller("StatusSystemProcesses", function ($scope, $rpc, gettext, $tr) {
	JUCI.interval.repeat("juci-process-list", 5000, function(done){
		$rpc.juci.system.process.list().done(function(processes){
			$scope.processes = processes.list; 
			$scope.columns = processes.fields; 
			$scope.$apply(); 
			done(); 
		});
	}); 
	$scope.isopen = false;
	$scope.getCpuUsage = function(){
		if(!$scope.processes) return '0%'
		var sum = 0;
		$scope.processes.map(function(x){sum += Number(x["%CPU"].slice(0, -1));});
		return sum + '%'
	};
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

UCI.juci.$registerSectionType("pagesystemstatus", {
	"show_meminfo": 	{ dvalue: true, type: Boolean }, 
	"show_diskinfo": 	{ dvalue: true, type: Boolean },
	"show_loadavg":		{ dvalue: false, type: Boolean }
}); 
UCI.juci.$insertDefaults("pagesystemstatus"); 

JUCI.app
.controller("statusSystemPage", function ($scope, $rootScope, $uci, $rpc, gettext, $tr, $config) {
	$scope.changes = [];
	if(!$rpc.juci) return; 

	Object.keys($uci).map(function(x){
		var tmp = []
		if($uci[x].$getWriteRequests){
			tmp = $uci[x].$getWriteRequests();
		}
		tmp.map(function(ch){
			if(ch.values){
				Object.keys(ch.values).map(function(opt){
					var uciField = $uci[ch.config][ch.section][opt];
					if(uciField.ovalue instanceof Array){
						if(uciField.ovalue.length == uciField.uvalue.length){
							var eq = true;
							for(var i = 0; i < uciField.ovalue.length; i++){
								if(uciField.ovalue[i] != uciField.uvalue[i]) eq = false;
							}
							if(eq) return;
						}
					}		
					if(uciField.ovalue == uciField.uvalue) return;
					$scope.changes.push({ config:ch.config, section: ch.section, option: opt, uvalue:ch.values[opt], ovalue: uciField.ovalue })
				});
			}
		});
	});
	$scope.data = {changes: $scope.changes}

	$scope.systemStatusTbl = {
		rows: [["", ""]]
	}; 
	$scope.systemMemoryTbl = {
		rows: [["", ""]]
	}; 
	$scope.systemStorageTbl = {
		rows: [["", ""]]
	}; 
	var info = {};
	var sys = {};  
	var board = { release: {} }; 
	var filesystems = []; 

	var prev_cpu = {}; 

	JUCI.interval.repeat("status.system.refresh", 1000, function(resume){
		async.parallel([
			function (cb){$rpc.juci.system.info().done(function(res){info = res; cb();}).fail(function(res){cb();});},
			function (cb){$rpc.system.info().done(function(res){sys = res; cb();}).fail(function(res){cb();});},
			function (cb){
				if(!$rpc.system.board) cb(); 
				else $rpc.system.board().done(function(res){board = res; cb();}).fail(function(res){cb();});
			},
			function (cb){$rpc.juci.system.filesystems().done(function(res){
				filesystems = res.filesystems; 
				cb();
			}).fail(function(res){cb();});}
		], function(err){
			function timeFormat(secs){
				secs = Math.round(secs);
				var days = Math.floor(secs / (60 * 60 * 24)); 
				var hours = Math.floor(secs / (60 * 60));

				var divisor_for_minutes = secs % (60 * 60);
				var minutes = Math.floor(divisor_for_minutes / 60);

				var divisor_for_seconds = divisor_for_minutes % 60;
				var seconds = Math.ceil(divisor_for_seconds);
				
				function pad(a,b){return(1e15+a+"").slice(-b)}; 
				
				return ((days > 0)?""+days+"d ":"")+pad(hours,2)+":"+pad(minutes,2)+":"+pad(seconds,2);
			}
			
			var cpu_load = 0; 
			try {
				cpu_load = Math.round(100 * (prev_cpu.usr - info.system.cpu.usr) / (prev_cpu.total - info.system.cpu.total)); 
			} catch(e){ }
			prev_cpu = (info.system || {}).cpu; 

			$scope.systemStatusTbl.rows = [
				[$tr(gettext("Hostname")), board.hostname || info.system.name],
				[$tr(gettext("Model")), board.release.codename || info.system.hardware || $tr(gettext("N/A"))],
				[$tr(gettext("Release")), board.release.description || info.system.firmware || $tr(gettext("N/A"))],
				[$tr(gettext("Firmware Version")), board.release.revision || $tr(gettext("N/A"))],
				[$tr(gettext("Local Time")), new Date(sys.localtime * 1000)],
				[$tr(gettext("Uptime")), timeFormat(sys.uptime)],
				[$tr(gettext("CPU")), ""+(cpu_load || 0)+"%"]
			]; 
			if($uci.juci["pagesystemstatus"] && $uci.juci["pagesystemstatus"].show_loadavg.value){
				$scope.systemStatusTbl.rows.push([$tr(gettext("System Load Avg. (1m)")), ""+(info.load.avg[0] / 10.0) + "%"]); 
			}
			if($config.local.mode == "expert"){
				var arr = $scope.systemStatusTbl.rows; 
				arr.push([$tr(gettext("Kernel Version")), board.kernel || info.system.kernel || $tr(gettext("N/A"))]); 
				arr.push([$tr(gettext("Filesystem")), info.system.filesystem || $tr(gettext("N/A"))]);
				arr.push([$tr(gettext("Target")), board.release.target || board.system || info.system.socver || $tr(gettext("N/A"))]);  
			}
			
			$scope.systemMemoryInfo = {
				mem_usage: Math.round(((sys.memory.total - sys.memory.free) / sys.memory.total) * 100), 
			};
				
			$scope.systemMemoryTbl.rows = [
				[$tr(gettext("Usage")), '<juci-progress value="'+Math.round((sys.memory.total - sys.memory.free) / 1000)+'" total="'+ Math.round(sys.memory.total / 1000) +'" units="kB"></juci-progress>'],
				[$tr(gettext("Shared")), '<juci-progress value="'+Math.round(sys.memory.shared / 1000)+'" total="'+ Math.round(sys.memory.total / 1000) +'" units="kB"></juci-progress>'],
				[$tr(gettext("Buffered")), '<juci-progress value="'+Math.round(sys.memory.buffered / 1000)+'" total="'+ Math.round(sys.memory.total / 1000) +'" units="kB"></juci-progress>'],
				[$tr(gettext("Swap")), '<juci-progress value="'+Math.round((sys.swap.total - sys.swap.free) / 1000)+'" total="'+ Math.round(sys.swap.total / 1000) +'" units="kB"></juci-progress>']
			];

			if($uci.juci["pagesystemstatus"] && $uci.juci["pagesystemstatus"].show_diskinfo.value){ 
				$scope.show_diskinfo = true; 
				$scope.systemStorageTbl.rows = []; 
				filesystems.map(function(disk){
					$scope.systemStorageTbl.rows.push([disk.filesystem+" ("+disk.path+")", '<juci-progress value="'+Math.round(disk.used)+'" total="'+ Math.round(disk.total) +'" units="kB"></juci-progress>']); 
				}); 
			}

			$scope.$apply(); 
			resume(); 
		});
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
.directive("systemNtpSettingsEdit", function(){
	return {
		templateUrl: "/widgets/system-ntp-settings-edit.html", 
		scope: {
			ngModel: "=ngModel"
		}, 
		controller: "systemNtpSettingsEdit", 
		replace: true
	 };  
})
.controller("systemNtpSettingsEdit", function($scope, $rpc, $uci, $tr, gettext){
	$uci.$sync("system").done(function(){
		$scope.ntp = $uci.system.ntp.server.value.map(function(x){ return { server: x }; }); 
		$scope.$watch("ntp", function onSystemNTPChanged(){
			var servers = {}; 
			$scope.ntp.filter(function(ntp){
				return ntp.server != ""; 
			}).map(function(ntp){
				servers[ntp.server] = true; 
			}); 
			//$scope.ntp = Object.keys(servers).map(function(x){ return { server: x }; }); 
			$uci.system.ntp.server.value = Object.keys(servers); 
		}, true); 
		$scope.$apply(); 
	}); 
	$scope.onDeleteNTPServer = function(ntp){
		$scope.ntp = $scope.ntp.filter(function(x){ return x != ntp; }); 
		//$scope.ntp.splice($scope.ntp.indexOf(ntp), 1); 
	}
	$scope.onAddNTPServer = function(){
		if(!$uci.system.ntp) return; 
		$scope.ntp.push({ server: "" }); 
	}
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"This will reset your configuration to factory defaults. Do you want to continue?":"","Passwords do not match!":"","Was unable to set password. Please make sure you have entered correct current password!":"","Hostname":"","Model":"","N/A":"","Release":"","Firmware Version":"","Kernel Version":"","Target":"","Local Time":"","Uptime":"","CPU":"","Load Average":"","Usage":"","Shared":"","Buffered":"","Swap":"","List of NTP servers":"","URL":"","NTP Settings":"NTP Settings","Configuration":"","settings.config.info":"Save your settings, restore previously saved settings, and reset your router to its factory state.\n\nYour router can save your configuration to a computer. We recommend to always save your last changed settings to a computer.","Save settings to computer with password protection":"","Save":"","Restore settings from a configuration saved on a computer":"","Load":"","Factory Settings":"Factory Settings","Reset restores the factory default settings of your gateway":"","Reset":"","Save Configuration to Computer":"","Comments":"","New Password":"","Re-type password":"","Pick configuration backup to upload":"","Backup file password":"","Password (if encrypted)":"","Start upgrade":"","Upgrade":"","Please add a comment describing this configuration":"","Energy Settings":"","settings.energy.info":"Reduce power consumption by switching off unused functionality.","USB Port":"","Status-LED":"","Power-LED":"","Power-LED Brightness":"","Missing uci config boardpanel.":"","Management":"","system.management.info":"Configure settings for managing your box over WAN interface. ","Gateway Password":"","settings.password.info":"Set a new password to restrict management access to the router.","Your account":"","Change Password":"","Services":"Services","Priority":"","Service":"Service","Enable":"","Action":"","settings.system.general":"General system settings.","Set to Browser Time":"","Timezone":"","General System Settings":"","Loading":"","System Status":"","Memory":"","Storage":"","status.system.processes.info":"Processes currently running on the router. ","Running Processes":"","settings-password-title":"Change Account Passwords","settings-configuration-title":"Configuration","settings-system-title":"System Settings","status-system-processes-title":"Processes","internet-services-ntp-title":"NTP Configuration","settings-services-title":"Services","status-system-title":"System Status","system-title":"System","settings-uci-title":"UCI Settings","settings-management-title":"Management Settings","settings-energy-title":"Energy Settings","menu-settings-password-title":"Passwords","menu-settings-configuration-title":"Configuration","menu-settings-system-title":"Settings","menu-status-system-processes-title":"Processes","menu-internet-services-ntp-title":"NTP","menu-settings-services-title":"Services","menu-status-system-title":"System","menu-system-title":"System","menu-settings-uci-title":"UCI Settings","menu-settings-management-title":"Management","menu-settings-energy-title":"Energy Settings"});
	gettextCatalog.setStrings('fi', {"This will reset your configuration to factory defaults. Do you want to continue?":"Tämä palauttaa tehdasasetukset. Haluatko jatkaa?","Passwords do not match!":"Salasanat eivät täsmää!","Was unable to set password. Please make sure you have entered correct current password!":"Salasanan asettaminen epäonnistui. Tarkista, että nykyinen salasana on oikein!","Hostname":"Isäntäkoneen nimi","Model":"Malli","N/A":"Ei saatavilla","Release":"Julkaisuaika:","Firmware Version":"Ohjelmistoversio","Kernel Version":"Kernel versio","Target":"Kohde","Local Time":"Paikallinen aika","Uptime":"Päälläoloaika","CPU":"CPU","Load Average":"Keskimääräinen kuormitus","Usage":"Käyttö","Shared":"Jaettu","Buffered":"Puskuroitu","Swap":"Swap","List of NTP servers":"Luettelo NTP-palvelimista","URL":"URL","NTP Settings":"NTP-asetukset","Configuration":"Konfiguraatio","settings.config.info":"Tallenna asetukset, palauta asetukset varmuuskopiosta tai palauta laitteen tehdasasetukset.\nVoit tallentaa varmuuskopion tietokoneellesi. Suosittelemme pitämään aina varmuuskopion tietokoneella viimeisimmästä konfiguraatiosta.","Save settings to computer with password protection":"Tallenna salasanalla suojattu asetusten varmuuskopio tietokoneelle","Save":"Tallenna","Restore settings from a configuration saved on a computer":"Palauta asetukset tietokoneelle tallennetusta varmuuskopiosta","Load":"Lataa","Factory Settings":"Tehdasasetukset","Reset restores the factory default settings of your gateway":"Palauta oletusasetuksiin palauttaa modeemin tehdasasetuksille","Reset":"Palauta oletusasetuksiin","Save Configuration to Computer":"Konfiguraatiomenetelmä","Comments":"Kommentit","New Password":"Uusi salasana","Re-type password":"Anna salasana uudelleen","Pick configuration backup to upload":"Valitse ladattava varmuuskopio","Backup file password":"Varmuuskopiotiedoston salasana","Password (if encrypted)":"Salasana (jos salattu)","Start upgrade":"Aloita päivitys","Upgrade":"﻿Päivitä","Please add a comment describing this configuration":"Lisää kommentti tästä konfiguraatiosta","Energy Settings":"Virranhallinta","settings.energy.info":"Vähennä virrankulusta poistamalla käyttämättömiä toimintoja käytöstä.","USB Port":"USB-portti","Status-LED":"Status-LED","Power-LED":"Power-LED","Power-LED Brightness":"Power-LED:n kirkkaus","Missing uci config boardpanel.":"Missing uci config boardpanel.","Management":"Hallinta","system.management.info":" ","Gateway Password":"Yhdyskäytävän salasana","settings.password.info":"Aseta modeemin uusi salasana rajoittaaksesi modeemin hallintaan pääsyä.","Your account":"Tilisi","Change Password":"Vaihda salasana","Services":"Fyysinen liitäntä","Priority":"Prioriteetti","Service":"Fyysinen liitäntä","Enable":"Ota käyttöön","Action":"Toiminto","settings.system.general":" ","Set to Browser Time":"Aseta selaimen aikaan","Timezone":"Aikavyöhyke","General System Settings":"Yleiset järjestelmäasetukset","Loading":"Lataan...","System Status":"Järjestelmän tila","Memory":"Muisti","Storage":"Tallennustila","status.system.processes.info":" ","Running Processes":"Käynnissä olevat prosessit","settings-password-title":"Salasana","settings-configuration-title":"Asetukset","settings-system-title":"Järjestelmä","status-system-processes-title":"Prosessit","internet-services-ntp-title":"NTP","settings-services-title":"Palvelut","status-system-title":"Järjestelmä","system-title":"Järjestelmä","settings-uci-title":"UCI","settings-management-title":"Hallinta","settings-energy-title":"Virranhallinta","menu-settings-password-title":"Salanat","menu-settings-configuration-title":"Konfiguraatio","menu-settings-system-title":"Järjestelmä","menu-status-system-processes-title":"Prosessit","menu-internet-services-ntp-title":"NTP","menu-settings-services-title":"Palvelut","menu-status-system-title":"Järjestelmä","menu-system-title":"Järjestelmä","menu-settings-uci-title":"UCI","menu-settings-management-title":"Hallinta","menu-settings-energy-title":"Virranhallinta"});
	gettextCatalog.setStrings('sv-SE', {"This will reset your configuration to factory defaults. Do you want to continue?":"Detta kommer att återställa dina inställningar till tillverkarens konfiguration","Passwords do not match!":"Lösenorden stämmer inte överens!","Was unable to set password. Please make sure you have entered correct current password!":"Kunde inte ställa in lösenordet. Kontrollera att nuvarande lösenord är rätt!","Hostname":"Datornamn","Model":"Modell","N/A":"N/A","Release":"Release Version","Firmware Version":"Firmware version","Kernel Version":"Kärnans version","Target":"Mål","Local Time":"Lokaltid","Uptime":"Upptid","CPU":"CPU","Load Average":"Genomsnittsbelastning","Usage":"Användning","Shared":"Delad","Buffered":"Buffrad","Swap":"Swap","List of NTP servers":"Listan med NTP servrar","URL":"URL","NTP Settings":"NTP Inställningar","Configuration":"Inställningar","settings.config.info":"Spara dina inställningar, återställa tidigare sparade inställningar och återställ EasyBox till fabrikstillstånd.Din EasyBox kan spara din konfiguration till en dator. Vi rekommenderar att alltid spara dina senaste ändrade inställningar till en dator.","Save settings to computer with password protection":"Spara konfigurationen till fil","Save":"Spara","Restore settings from a configuration saved on a computer":"Återställ konfigurationsinställnignar från fil på din dator","Load":"Ladda upp","Factory Settings":"Fabriksinställningar","Reset restores the factory default settings of your gateway":"Reset återställer fabriksinställningarna på din gateway","Reset":"Reset","Save Configuration to Computer":"Ladda ner inställningar","Comments":"Kommentarer","New Password":"Nytt lösenord","Re-type password":"Skriv lösenord igen","Pick configuration backup to upload":"Välj konfigurationsbackup för uppladdning","Backup file password":"Lösenord för backupfil","Password (if encrypted)":"Lösenord (om du vill kryptera)","Start upgrade":"Påbörja uppgradering","Upgrade":"Uppgradera","Please add a comment describing this configuration":"Kommentar som beskriver konfigurationen","Energy Settings":"Energi-inställningar","settings.energy.info":"Minska energiförbrukningen genom att stänga av oanvända funktioner.","USB Port":"USB Port","Status-LED":"Status-LED","Power-LED":"Power-LED","Power-LED Brightness":"Power-LED Ljusstyrka","Missing uci config boardpanel.":"Saknar uci config-panel","Management":"Management","system.management.info":"Här kan du öppna tillgång till olika tjänster från WAN sidan","Gateway Password":"Gateway lösenord","settings.password.info":"Ställ en ny Easybox lösenord för att begränsa hanteringsåtkomst till routern.","Your account":"Ditt konto","Change Password":"Ändra lösenord","Services":"Tjänster","Priority":"Prioritet","Service":"Tjänst","Enable":"Aktivera","Action":"","settings.system.general":"Systeminställningar","Set to Browser Time":"Sätt till webbläsarens tid","Timezone":"Tidszon","General System Settings":"Generella Inställningar","Loading":"Laddar...","System Status":"Systemstatus","Memory":"Minne","Storage":"Utrymme","status.system.processes.info":"Här kan du se processer som körs","Running Processes":"Processer","settings-password-title":"Lösenord","settings-configuration-title":"Spara Inställningar","settings-system-title":"Systeminställningar","status-system-processes-title":"Processer","internet-services-ntp-title":"NTP","settings-services-title":"Tjänster","status-system-title":"Systemstatus","system-title":"System","settings-uci-title":"UCI","settings-management-title":"Management","settings-energy-title":"Energispar","menu-settings-password-title":"Lösenord","menu-settings-configuration-title":"Backup","menu-settings-system-title":"Systeminställningar","menu-status-system-processes-title":"Processer","menu-internet-services-ntp-title":"NTP","menu-settings-services-title":"Tjänster","menu-status-system-title":"Systemstatus","menu-system-title":"System","menu-settings-uci-title":"UCI","menu-settings-management-title":"Management","menu-settings-energy-title":"Energispar"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("widgets/system-ntp-settings-edit.html", "<div>\n<div class=\"input-group form-group\" ng-repeat=\"n in ntp track by $index\">\n<input type=\"text\" class=\"form-control\" ng-model=\"n.server\" placeholder=\"{{'URL'|translate}}\"/>\n<span class=\"input-group-btn\">\n<button class=\"btn btn-default\" ng-click=\"onDeleteNTPServer(n)\">\n<i class=\"fa fa-times\"></i>\n</button>\n</span>\n</div>\n<button class=\"btn btn-default pull-right\" ng-click=\"onAddNTPServer()\"><i class=\"fa fa-plus\"></i></button>\n</div>\n");JUCI.template("pages/internet-services-ntp.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"InternetServicesNTPPage\">\n<juci-config-section title=\"{{'NTP Settings'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{'List of NTP servers'|translate}}\">\n<system-ntp-settings-edit></system-ntp-settings-edit>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/settings-configuration.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"SettingsConfigurationCtrl\">\n<h2 translate>Configuration</h2>\n<juci-config-info>{{ 'settings.config.info' | translate }}</juci-config-info>\n<juci-config-section title=\"{{'Backup / Restore'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{'Save settings to computer with password protection'|translate}}\">\n<a ng-show=\"backupData\" download=\"backup.tar.gz\" href=\"{{backupData}}\" translate>Download</a>\n<button class=\"btn btn-lg btn-default\" ng-click=\"onSaveConfig()\">{{'Save'|translate}}</button>\n</juci-config-line>\n<juci-config-line title=\"{{'Restore settings from a configuration saved on a computer'|translate}}\">\n<button class=\"btn btn-lg btn-default\" ng-click=\"onRestoreConfig()\">{{'Load'|translate}}</button>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n<juci-config-section title=\"{{'Factory Settings'|translate}}\">\n<juci-config-lines >\n<juci-config-line title=\"{{'Reset restores the factory default settings of your gateway'|translate}}\">\n<button class=\"btn btn-lg btn-default\" ng-click=\"onReset()\" ng-disable=\"!resetPossible\">{{'Reset'|translate}}</button>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n<modal title=\"{{'Save Configuration to Computer'|translate}}\" ng-show=\"showModal\" on-accept=\"onAcceptModal()\" on-dismiss=\"onDismissModal()\" dismiss-label=\"Cancel\" accept-label=\"Continue\">\n<div class=\"form-group\" ng-show=\"features.comment\">\n<label translate>Please add a comment describing this configuration</label>\n<textarea class=\"form-control\" placeholder=\"{{'Comments'|translate}}...\" name=\"comment\"/>\n</div>\n<div class=\"form-group\">\n<label translate>Backup file password</label>\n<input type=\"password\" ng-disabled=\"!features.encryption\" class=\"form-control\" placeholder=\"{{'New Password'|translate}}\" name=\"pass\" ng-model=\"data.pass\"/>\n</div>\n<div class=\"form-group\">\n<label translate>Re-type password</label>\n<input type=\"password\" ng-disabled=\"!features.encryption\" class=\"form-control\" placeholder=\"{{'Re-type password'|translate}}\" name=\"pass_repeat\" ng-model=\"data.pass_repeat\"/>\n</div>\n<div class=\"alert alert-danger\" ng-show=\"!features.encryption\" \ntranslate>Encryption of backups has been disabled (please make sure you have openssl cli utility installed!)</div>\n</modal>\n<modal title=\"Load New Configuration\" ng-show=\"showUploadModal\" on-accept=\"onUploadConfig()\" on-dismiss=\"onCancelRestore()\" dismiss-label=\"Cancel\" accept-label=\"Continue\">\n<juci-config-lines>\n<juci-config-line title=\"{{'Pick configuration backup to upload'|translate}}\">\n<input type=\"file\" class=\"btn btn-default btn-file\"  onchange=\"angular.element(this).scope().onUploadFileChanged(event.target.files[0])\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Backup file password'|translate}}\">\n<input type=\"password\" class=\"form-control\" name=\"pass\" ng-disabled=\"!features.encryption\" ng-model=\"data.pass\" placeholder=\"{{'Password (if encrypted)'|translate}}\"/>\n</juci-config-line>\n<div class=\"alert alert-danger\" ng-show=\"!features.encryption\" \ntranslate>Uploading encrypted backups is not supported (requires openssl cli utility installed on the router!)</div>\n<!--<juci-config-line title=\"{{'Start upgrade'|translate}}\">\n<input type=\"submit\" class=\"btn btn-lg btn-default\" value=\"{{'Upgrade'|translate}}\"/>\n</juci-config-line>-->\n</juci-config-lines>\n</modal>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/settings-energy.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"SettingsEnergyCtrl\">\n<juci-config-heading>{{ 'Power Saving and Energy Settings' | translate }}</juci-config-heading>\n<juci-config-info>{{ 'settings.energy.info' | translate }}</juci-config-info>\n<p translate ng-hide=\"boardpanel\">Missing uci config boardpanel.</p>\n<juci-config-section title=\"{{'Energy Settings'|translate}}\"ng-show=\"boardpanel\">\n<juci-config-lines>\n<juci-config-line title=\"{{'USB Port'|translate}}\">\n<switch id=\"enabled\" name=\"enabled\" ng-model=\"boardpanel.settings.usb_port.value\" class=\"green\" ng-change=\"onSave()\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{'Status-LED'|translate}}\">\n<switch id=\"enabled\" name=\"enabled\" ng-model=\"boardpanel.settings.status_led.value\" class=\"green\" ng-change=\"onSave()\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{'Power-LED'|translate}}\">\n<switch id=\"enabled\" name=\"enabled\" ng-model=\"boardpanel.settings.power_led.value\" class=\"green\" ng-change=\"onSave()\"></switch>\n</juci-config-line>\n<juci-config-line title=\"{{'Power-LED Brightness'|translate}}\" no-pull ng-show=\"boardpanel.settings.power_led.value\">\n<juci-brightness ng-model=\"boardpanel.settings.power_led_br.value\" min=\"0\" max=\"100\" ng-change=\"onSave()\"></juci-brightness>\n<!--<switch id=\"enabled\" name=\"enabled\" ng-model=\"boardpanel.settings.power_led_br.value\" class=\"green\"></switch>-->\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/settings-management.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"SettingsManagementPage\">\n<juci-config-section title=\"{{'Management'|translate}}\">\n<juci-config-info>{{'system.management.info'|translate}}</juci-config-info>\n</juci-config-section>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/settings-password.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"settingsPasswordPage\">\n<juci-config-heading>{{ 'Password Settings' | translate }}</juci-config-heading>\n<juci-config-info>{{ 'settings.password.info' | translate }}</juci-config-info>\n<juci-config-section title=\"{{'Users'|translate}}\">\n<juci-config-lines>\n<juci-config-line title=\"{{'Change password for user'|translate}}\">\n<juci-select ng-model=\"modal.username\" ng-items=\"allUsers\"></juci-select><br/>\n<button class=\"btn btn-default pull-right\" ng-click=\"onChangePasswordClick()\">{{'Change Password'|translate}}</button>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n<modal title=\"{{'Change Password'|translate}}\" ng-show=\"showModal\" on-accept=\"onAcceptModal()\" on-dismiss=\"onDismissModal()\" dismiss-label=\"Cancel\" accept-label=\"Change Password\">\n<form class=\"form-horizontal\">\n<div class=\"alert alert-danger\" ng-show=\"error\">{{error}}</div>\n<div class=\"form-group\">\n<label class=\"col-sm-4 control-label\">Current Password</label>\n<div class=\"col-sm-8\">\n<input ng-model=\"modal.old_password\" type=\"password\" class=\"form-control\" id=\"inputEmail3\" placeholder=\"Current Password\">\n</div>\n</div> \n<div class=\"form-group\">\n<label class=\"col-sm-4 control-label\">New Password</label>\n<div class=\"col-sm-8\">\n<input ng-model=\"modal.password\"  type=\"password\" class=\"form-control\" id=\"inputPassword3\" placeholder=\"New Password\">\n</div>\n</div>\n<div class=\"form-group\">\n<label class=\"col-sm-4 control-label\">Reenter Password</label>\n<div class=\"col-sm-8\">\n<input ng-model=\"modal.password2\" type=\"password\" class=\"form-control\" id=\"inputPassword3\" placeholder=\"Reenter Password\">\n</div>\n</div>\n<div class=\"form-group\">\n<label class=\"col-sm-4 control-label\">Password Strength</label>\n<div class=\"col-sm-4\">\n<div ng-show=\"passwordStrength == 0\"><label>Weak</label><br/><div class=\"col-sm-1\" style=\"height: 4px; background-color: #e00;\" /></div>\n<div ng-show=\"passwordStrength == 1\"><label>Not enough</label><br/><div class=\"col-sm-5\"  style=\"height: 4px; background-color: #FF7E00;\" /></div>\n<div ng-show=\"passwordStrength == 2\"><label>Medium</label><br/><div class=\"col-sm-8\"  style=\"height: 4px; background-color: #FF9000;\" /></div>\n<div ng-show=\"passwordStrength == 3\"><label>Strong</label><br/><div class=\"col-sm-12\"  style=\"height: 4px; background-color: #2D951E;\" /></div>\n</div>\n</div>\n</form>\n</modal>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/settings-services.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"ServicesStatusPage\">\n<h2 translate>Services</h2>\n<table class=\"table\">\n<thead>\n<th translate>Priority</th>\n<th translate>Service</th>\n<th translate>Enable</th>\n<th translate>Action</th>\n</thead>\n<tr ng-repeat=\"service in services track by $index\">\n<td>{{(service.start_priority < 100)? service.start_priority : \"N/A\"}}</td>\n<td>{{service.name}}</td>\n<td>\n<switch ng-model=\"service.enabled\" ng-change=\"onServiceEnable(service)\" class=\"green\"></switch>\n\n</td>\n<td>\n<div class=\"button-group\">\n<button tooltip=\"{{(service.running)?'Stop service':'Start service'}}\" class=\"btn btn-default\" ng-click=\"onServiceToggle(service)\"><i ng-class=\"{'fa fa-stop': service.running, 'fa fa-play': !service.running}\"></i></button>\n<button ng-class=\"{'btn btn-default' : !service.reload, 'btn btn-info': service.reload}\" ng-click=\"onServiceReload(service)\"><i class=\"fa fa-refresh\"></i></button>\n</div>\n</td>\n</tr>\n</table>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/settings-system.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"SettingsSystemGeneral\">\n<h2 translate>General System Settings</h2>\n<juci-config-info>{{'settings.system.general'|translate}}</juci-config-info>\n<i class=\"fa fa-spinner fa-spin fa-2x\" ng-show=\"!loaded\"></i>\n<juci-config-section title=\"{{'Time and Timezone'|translate}}\" ng-show=\"loaded\">\n<juci-config-lines>\n<juci-config-line title=\"{{'System Time'|translate}}\">\n<span class=\"label label-default\">{{localtime}}</span>\n</juci-config-line>\n<juci-config-line title=\"{{'Reset Time'|translate}}\">\n<button class=\"btn btn-default btn-success\" ng-click=\"setRouterTimeToBrowserTime()\" ng-disabled=\"state == 'SETTING_TIME'\">\n<i class=\"fa fa-spin fa-spinning\" ng-show=\"state == 'SETTING_TIME'\"></i>{{'Set to Browser Time'|translate}}\n</button>\n</juci-config-line>\n<juci-config-line title=\"{{'Timezone'|translate}}\">\n<juci-select ng-model=\"system.zonename.value\" ng-items=\"allTimeZones\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Hostname'|translate}}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"system.hostname.value\" placeholder=\"{{'Hostname'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Time servers (NTP)'|translate}}\">\n<system-ntp-settings-edit></system-ntp-settings-edit>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/settings-uci.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"SettingsUCIController\">\n<h2>Advanced settings</h2>\n<ui-select ng-model=\"selectedSection\"\n theme=\"bootstrap\"\n search-enabled=\"false\"\n style=\"width: 200px;\"\n on-select=\"onChangeSection($item, $model)\"\n>\n<ui-select-match placeholder=\"Select config section...\">{{$select.selected.label}}</ui-select-match>\n<ui-select-choices repeat=\"section in sections\"\n refresh-delay=\"0\">\n<div >{{section.label}}</div>\n</ui-select-choices>\n</ui-select><br/><br/>\n<span ng-show=\"loading\" translate>Loading</span>\n<div class=\"panel panel-danger\" ng-show=\"error && !loading\">\n<div class=\"panel-heading\">\n<h3 class=\"panel-title\">ERROR</h3>\n</div>\n<div class=\"panel-body\">\n<p class=\"col-md-12\" style=\"font-size: 20px; color: red;\" >{{error}}</p>\n</div>\n</div>\n<div ng-repeat=\"(section_id, values) in subsections track by $index\" ng-show=\"!loading\" class=\"col-md-6\">\n<div class=\"panel panel-default\">\n<div class=\"panel-heading\">\n<h3 class=\"panel-title\">{{ section_id }}</h3>\n</div>\n<div class=\"panel-body\">\n<div class=\"row\" ng-repeat=\"(k, v) in values track by $index\">\n<div class=\"col-md-6\">\n{{k}}\n</div>\n<div class=\"col-md-6\">\n<input type=\"text\" class=\"form-control\" ng-model=\"values[k]\"/>\n</div>\n</div>\n</div>\n<div class=\"panel-footer\">\n<button class=\"btn btn-primary\" ng-click=\"onSaveSection(section_id)\"> Save </button>\n<button class=\"btn btn-default\" ng-click=\"onResetSection(section_id)\"> Reset </button>\n</div>\n</div>\n</div>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/status-system-processes.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"StatusSystemProcesses\">\n<h2 translate>Processes</h2>\n<p translate>System processes and CPU usage.</p>\n<div class=\"panel panel-default\">\n<div class=\"panel-body\">\n<b translate>Total number of processes: {{processes.length}}</b><br/>\n<b translate>Total CPU usage: {{getCpuUsage()}}</b>\n</div>\n</div>\n<accordion close-others=\"false\">\n<accordion-group is-open=\"isopen\" heading=\"Click here to view details {{isopen ? 'v' : '>'}}\">\n<h2 translate>Running Processes</h2>\n<juci-config-info>{{'status.system.processes.info'|translate}}</juci-config-info>\n<table class=\"table\">\n<thead><th ng-repeat=\"column in columns track by $index\">{{column}}</th></thead>\n<tr ng-repeat=\"proc in processes track by $index\">\n<td ng-repeat=\"column in columns track by $index\">{{proc[column]}}</td>\n</tr>\n</table>\n</accordion-group>\n</accordion>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/status-system.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"statusSystemPage\">\n<juci-table\ntitle=\"{{'System Status'|translate}}\"\ndata=\"systemStatusTbl\"></juci-table>\n<juci-table\ntitle=\"{{'Memory'|translate}}\"\ndata=\"systemMemoryTbl\"></juci-table>\n<juci-table ng-show=\"show_diskinfo\"\ntitle=\"{{'Storage'|translate}}\"\ndata=\"systemStorageTbl\"></juci-table>\n<div ng-show=\"data.changes.length\">\n<h2 translate>Unsaved changes</h2>\n<juci-changes-edit ng-model=\"data\" hide-btn=\"true\"></juci-changes-edit>\n<div>\n</div>\n</juci-layout-with-sidebar>\n");JUCI.template("pages/system.html", "");