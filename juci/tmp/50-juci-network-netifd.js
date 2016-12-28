
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
	// add control dependency 
	JUCI.app.requires.push("dropdown-multi-select");

	JUCI.app.factory("$network", function($rpc, $uci, $ethernet){
		var sync_hosts = $uci.$sync("hosts"); 
		function _refreshClients(self){
			var deferred = $.Deferred(); 
			$rpc.juci.network.clients().done(function(res){
				sync_hosts.done(function(){
					if(res && res.clients){
						self.clients = res.clients.map(function(cl){
							// update clients with some extra information from hosts database
							var key = cl.macaddr.replace(/:/g, "_"); 
							if($uci.hosts[key]) {
								var host = $uci.hosts[key]; 
								console.log("Found host for "+key); 
								cl.manufacturer = host.manufacturer.value; 
								if(host.name) cl.name = host.name.value; 
							}
							return cl; 
						}); 
						deferred.resolve(self.clients);  
					} else {
						deferred.reject(); 
					}
				}); 
			}).fail(function(){ deferred.reject(); });
			return deferred.promise(); 
		}
		
		function NetworkDevice(){
			this.name = ""; 
		}
		
		function NetworkBackend() {
			this.clients = []; 
			this._subsystems = []; 
			this._devices = null; 
		}
		
		NetworkBackend.prototype.subsystem = function(proc){
			if(!proc || !(proc instanceof Function)) throw new Error("Subsystem argument must be a function returning a subsystem object!"); 
			var subsys = proc(); 
			if(!subsys.annotateClients) throw new Error("Subsystem must implement annotateClients()"); 
			this._subsystems.push(subsys); 
		}
		
		NetworkBackend.prototype.getDevice = function(opts){
			alert("$network.getDevice has been removed. No alternative. "); 
		}; 
		
		NetworkBackend.prototype.getDevices = function(){
			alert("$network.getDevices has been removed. Use $ethernet.getDevices instead!"); 
		}
		
		// should be renamed to getInterfaces for NETWORK (!) interfaces. 
		NetworkBackend.prototype.getNetworks = function(opts){
			var deferred = $.Deferred(); 
			var filter = filter || {}; 
			var networks = []; 
			var self = this; 
			var devmap = {}; 
			if(!opts) opts = {}; 
			var filter = opts.filter || {};
			var info = {};
			async.series([
				function(next){
					$ethernet.getAdapters().done(function(devs){
						devs.map(function(x){ devmap[x.name] = x; }); 
					}).always(function(){ next(); }); 
				}, function(next){
					$uci.$sync("network").done(function(){
						$uci.network["@interface"].map(function(i){
							i.devices = []; 
							var fixed = i.ifname.value.split(" ").filter(function(name){
								return name && name != ""; 
							}).map(function(name){
								if(name in devmap) i.devices.push(devmap[name]); 
								return name; 
							}).join(" "); 
							i.ifname.value = fixed;
							if(i[".name"] == "loopback") return; 
							if(filter.no_aliases && i[".name"].indexOf("@") == 0 || i.type.value == "alias") return; 
							networks.push(i); 
						}); 
					}).always(function(){
						next(); 
					}); 
				}, function(next){
					$rpc.network.interface.dump().done(function(result){
						if(result && result.interface) {
							info = result.interface;
						}
					}).always(function(){
						next();
					}); 
				}
			], function(){
				networks = networks.map(function(x){
					// set $info to the information gathered from network.interface.dump() or undefined
					if(info && info.find)
						x.$info = info.find(function(y){ return x[".name"] == y.interface; });
					return x;
				});
				deferred.resolve(networks); 
			}); 
			
			return deferred.promise(); 
		}
		
		NetworkBackend.prototype.getConnectedClients = function(){
			var deferred = $.Deferred(); 
			var self = this; 
			
			_refreshClients(self).done(function(clients){
				async.each(self._subsystems, function(sys, next){
					if(sys.annotateClients) {
						sys.annotateClients(clients).always(function(){ next(); }); 
					} else {
						next(); 
					}
				}, function(){
					clients.map(function(cl){
						if(!cl._display_widget) cl._display_widget = "network-client-lan-display-widget"; 
					}); 
					deferred.resolve(clients); 
				});
			}).fail(function(){
				deferred.reject(); 
			});  
			
			return deferred.promise(); 
		}
		
		NetworkBackend.prototype.getNameServers = function(){
			var deferred = $.Deferred(); 
			var self = this; 
			$rpc.juci.network.nameservers().done(function(result){
				if(result && result.nameservers) deferred.resolve(result.nameservers); 
				else deferred.reject(); 
			}); 
			
			return deferred.promise(); 
		}
		
		NetworkBackend.prototype.getNetworkLoad = function(){
			var def = $.Deferred(); 
			
			$rpc.juci.network.load().done(function(res){
				def.resolve(res); 
			});
			
			return def.promise(); 
		}
		
		NetworkBackend.prototype.getNatTable = function(){
			var def = $.Deferred(); 
			
			$rpc.juci.network.nat_table().done(function(result){
				if(result && result.table){
					def.resolve(result.table); 
				} else {
					def.reject(); 
				}
			}); 
			return def.promise(); 
		}
		
		NetworkBackend.prototype.getLanNetworks = function(){
			var deferred = $.Deferred(); 
			this.getNetworks().done(function(nets){
				deferred.resolve(nets.filter(function(x){ return x.is_lan.value == 1; })); 
			}); 
			return deferred.promise(); 
		}
		
		NetworkBackend.prototype.getWanNetworks = function(){
			var deferred = $.Deferred(); 
			console.log("$network.getWanNetworks() is deprecated. You should list firewall zone wan to get whole list"); 
			this.getNetworks().done(function(nets){
				deferred.resolve(nets.filter(function(x){ return !x.is_lan.value; })); 
			}); 
			return deferred.promise(); 
		}
		
		// returns list of config sections belong to devices that are configured as default routes along with their runtime info in $info field
		NetworkBackend.prototype.getDefaultRouteNetworks = function(){
			var def = $.Deferred(); 
	
			$uci.$sync("network").done(function(){
				if(!$rpc.network || !$rpc.network.interface) { def.reject(); return; }
				$rpc.network.interface.dump().done(function(result){
					if(result && result.interface) {
						var wanifs = []; 
						result.interface.map(function(i){
							if(i.route && i.route.length && i.route.find(function(r){ return r.target == "0.0.0.0" || r.target == "::"; })){
								// lookup the config section for this device 
								var conf = $uci.network["@interface"].find(function(x){ return x[".name"] == i.interface; }); 
								if(conf) {	
									conf.$info = i; 
									wanifs.push(conf); 
								}
							}
						}); 
						def.resolve(wanifs); 
					} else {
						def.reject(); 
					}
				}).fail(function(){
					def.reject(); 
				}); 
			}).fail(function(){
				def.reject(); 
			}); 

			return def.promise(); 
		}	

		NetworkBackend.prototype.getServices = function(){
			var def = $.Deferred(); 
			$rpc.juci.network.services().done(function(result){
				if(result && result.list) def.resolve(result.list); 
				else def.reject(); 
			}); 
			return def.promise(); 
		}
		
		return new NetworkBackend(); 
	}); 
	
	// register basic vlan support 
	JUCI.app.run(function($network, $uci, $rpc, $events, gettext, $tr, $ethernet, networkConnectionPicker){
		$events.subscribe("hotplug.net", function(ev){
			if(ev.data.action == "add"){
				// we need to make sure that the new device is not already added to a network. 
				$uci.$sync("network").done(function(){
					var found = $uci.network["@interface"].find(function(net){
						return net.ifname.value.split(" ").find(function(x){ return x == ev.data.interface; }); 
					}); 
					// currently does not work correctly
					/*if(!found){
						if(confirm($tr(gettext("A new ethernet device has been connected to your router. Do you want to add it to a network?")))){
							networkConnectionPicker.show().done(function(picked){
								picked.ifname.value = picked.ifname.value.split(" ").concat([ev.data.interface]).join(" "); 
							});
						}
					}*/ 
				}); 
			}
		}); 
	}); 
}(); 


/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Martin K. Schröder <mkschreder.uk@gmail.com>
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


UCI.validators.IP6PrefixLengthValidator = function(){
	this.validate = function(field){
		var valid_values = ["no"];
		for(var i = 48; i <= 64; i++){
			valid_values.push(String(i));
		}
		if(field.value == "" || valid_values.find(function(x){ return x == field.value}) != undefined) return null;
		return gettext("valid values are: 'no' and 48-64");
	}
};

UCI.validators.MACListValidator = function(){
	this.validate = function(field){
		if(field.value instanceof Array){
			var errors = []; 
			field.value.map(function(value){
				if(!value.match(/^(?:[A-Fa-f0-9]{2}[:-]){5}(?:[A-Fa-f0-9]{2})$/))
					errors.push(gettext("value must be a valid MAC-48 address")+": "+value); 
			}); 
			if(errors.length) return errors.join(", "); 
		}
		return null; 
	}
}; 

UCI.validators.REQPrefixValidator = function(){
	this.validate = function(field){
		if(field.value == "auto" || field.value == "no") return null; // ok string values
		var number = parseInt(field.value);
		if(number < 65 && number > -1) return null;
		return gettext("Valid values are: auto, no, 0-64");
	}
};

UCI.$registerConfig("network"); 
UCI.network.$registerSectionType("interface", {
	"is_lan":				{ dvalue: '', type: Boolean }, // please stop relying on this!
	"auto": 				{ dvalue: '', type: Boolean }, // bring up on boot
	"ifname":				{ dvalue: '', type: String }, 
	"device":				{ dvalue: '', type: String }, 
	"proto":				{ dvalue: '', type: String }, 
	"ipaddr":				{ dvalue: '', type: String, validator: UCI.validators.IP4AddressValidator }, 
	"netmask":				{ dvalue: '', type: String, validator: UCI.validators.IP4NetmaskValidator },
	"gateway":				{ dvalue: '', type: String, validator: UCI.validators.IP4AddressValidator }, 
	"ip6addr":				{ dvalue: '', type: String, validator: UCI.validators.IP6AddressValidator }, 
	"ip6gw": 				{ dvalue: '', type: String, validator: UCI.validators.IP6AddressValidator },
	"ip6prefix":			{ dvalue: '', type: String, validator: UCI.validators.IP6AddressValidator }, 
	"ip6gateway":			{ dvalue: '', type: String, validator: UCI.validators.IP6AddressValidator },  
	"ip6assign":			{ dvalue: '', type: Number }, 
	"ip6hint": 				{ dvalue: '', type: String, validator: UCI.validators.IP6AddressValidator },
	"clientid": 			{ dvalue: "", type: String },
	"type":					{ dvalue: '', type: String }, 
	"defaultroute":			{ dvalue: '', type: Boolean },	
	"bridge_instance": 		{ dvalue: '', type: Boolean }, 
	"vendorid":				{ dvalue: '', type: String }, 
	"ipv6":					{ dvalue: '', type: Boolean },
	"dns": 					{ dvalue: [], type: Array }, 
	"macaddr":				{ dvalue: "", type: String, validator: UCI.validators.MACAddressValidator }, 
	"mtu":					{ dvalue: "", type: Number },
	"enabled": 				{ dvalue: true, type: Boolean }, 
	//dhcp settings
	"reqopts":				{ dvalue: "", type: String },
	"metric":				{ dvalue: '', type: Number },
	"iface6rd":				{ dvalue: "", type: String },
	"broadcast": 			{ dvalue: '', type: String, validator: UCI.validators.IP4AddressValidator }, 
	"hostname": 			{ dvalue: "", type: String }, 
	"peerdns": 				{ dvalue: '', type: Boolean }, 
	//ipv6 settings
	"tunlink":				{ dvalue: "", type: String },
	"ip6prefixlen":			{ dvalue: "", type: String, validator: UCI.validators.IP6PrefixLengthValidator },
	"ip4prefixlen":			{ dvalue: "", type: Number },
	"reqprefix":			{ dvalue: "", type: String, validator: UCI.validators.REQPrefixValidator },
	"reqaddress":			{ dvalue: "", type: String },
	// authentication 
	"auth": 				{ dvalue: "", type: String }, 
	"username": 			{ dvalue: "", type: String }, 
	"password": 			{ dvalue: "", type: String }, 
	// ppp settings
	"tunnelid":				{ dvalie: "", type: Number },
	"_update":				{ dvalue: '', type: Boolean },
	"peeraddr":				{ dvalue: "", type: String, validator: UCI.validators.IPAddressValidator },
	"server":				{ dvalue: "", type: String },
	"_keepalive_failure":	{ dvalue: "", type: Number },
	"_keepalive_interval":	{ dvalue: "", type: Number },
	"demand":				{ dvalue: "", type: Number },
	// pppoe settings
	"ac":					{ dvalue: "", type: String },
	// 3g and dongles
	"modem":				{ dvalue: "", type: String },
	"service":				{ dvalue: "", type: String },
	"maxwait":				{ dvalue: "", type: Number },
	"apn": 					{ dvalue: "", type: String }, 
	"pincode": 				{ dvalue: "", type: String },
	"comdev":				{ dvalue: "", type: String },
	"ttl":					{ dvalue: "", type: Number }
}, function(section){
	if(!section.proto || !section.proto.value || section.proto.value == "") 
		return gettext("Network interface ") + (section[".name"] || section.name || gettext("Unnamed interface")) + gettext(" MUST have  a protocol set");
	var errors = [];
	switch (section.proto.value){
		case "none":
			break;
		case "static":
			if(section.ipaddr.value && section.netmask.value){
				var ip = section.ipaddr.value.split("."); 
				var np = section.netmask.value.split("."); 
				if(ip[ip.length - 1] == "0") errors.push("IP address can not be a range address (can not end with 0s)!"); 	
				if(ip[0] == "0") errors.push("IP address can not start with a '0'!"); 	
				/*if(ip.length == np.length == 4){
					var bad = false; 
					ip.forEach(function(x, i){
						if(x == "0" && np[i] == "0") bad = true;
					}); 
					if(bad) errors.push("Given IP address and netmask are invalid together!"); 
				}*/
			}
			if((section.ipaddr.value == "" || section.netmask.value == "") && section.ip6addr.value == "")
				errors.push(gettext("Either ipv4 or ipv6 address is needed"));
			break;
		case "dhcp":
			break;
		case "dhcpv6":
			break;
		case "ppp":
			if(section.device.value == "")
				errors.push(gettext("Modem device needed for PPP interface"));
			break;
		case "pppoe":
			break;
		case "pppoa":
			break;
		case "3g":
			if(section.device.value == "")
				errors.push(gettext("Modem device needed for 3G interface"));
			if(section.service.value != "umts" && section.service.value != "umts_only" && section.service.value != "gprs_only" && section.service.value != "evdo")
				errors.push(gettext("Service type needed for 3G interface"));
			if(section.apn.value == "")
				errors.push(gettext("APN needed for 3G interface"));
			break;
		case "4g":
			if(section.modem.value == "")
				errors.push(gettext("Device needed for 4G interface"));
			break;
		case "pptp":
			if(section.server.value == "")
				errors.push(gettext("VPN Server needed for Point-to-Point tunnel"));
			break;
		case "6in4":
			if(section.peeraddr.value == "")
				errors.push(gettext("Remote IPv4 address needed for 6in4 interface"));
			if(section.ip6addr.value == "")
				errors.push(gettext("Local IPv6 address needed for 6in4 interface"));
			break;
		case "6to4":
			//no required values for 6to4 interface
			break;
		case "6rd":
			if(section.peeraddr.value == "")
				errors.push(gettext("Remote IPv4 address needed for IPv6 rapid deployment interface"));
			if(section.ip6prefix.value == "")
				errors.push(gettext("IPv6 prefix needed for IPv6 rapid deployment interface"));
			if(section.ip6prefixlen.value == "")
				errors.push(gettext("IPv6 prefix length needed for IPv6 rapid deployment interface"));
			break;
		case "dslite":
			if(section.peeraddr.value == "")
				errors.push(gettext("DS-Lite AFTR address needed for DS lite interface"));
			break;
		case "l2tp":
			if(section.server.value == "")
				errors.push(gettext("L2TP server needed for PPP over L2TP"));
			if(section.username.value != "" && section.password.value == "")
				errors.push(gettext("Password needed when username is set"));
			break;
		default: 
			return gettext("Unsupported protocol: ") + section.proto.value;
	}
	if(errors.length > 0) return errors
	return null;
}); 

UCI.network.$registerSectionType("route", {
	"interface": 			{ dvalue: "", type: String }, 
	"target": 				{ dvalue: "", type: String, validator: UCI.validators.IP4AddressValidator, required: true }, 
	"netmask": 				{ dvalue: "", type: String, validator: UCI.validators.IP4AddressValidator, required: true }, 
	"gateway": 				{ dvalue: "", type: String, validator: UCI.validators.IP4AddressValidator },
	"metric": 				{ dvalue: 0, type: Number },
	"mtu": 					{ dvalue: undefined, type: Number }
}, function(section){
	if(!section) return;
	// do not return list of errors because it will create a HUGE list of errors if user happens to have added multiple sections with errors. 
	// better to return only one error at a time!
	if(section.interface.value == "") return gettext("Please specify interface for route!");
	if(section.target.value == "") return gettext("Please specify target for route!"); 
	if(section.netmask.value == "") return gettext("Please specify netmask for route!"); 
	if(section.metric.value < 0) return gettext("Route metrix can not be a negative value!"); 

	// make sure we throw an error if there are duplicates
	return ["target"].map(function(f){
		var dups = UCI.network["@route"].filter(function(x){ 
			return x != section && section[f].value && section[f].value == x[f].value; 
		}); 
		if(dups.length) {
			return gettext("Duplicate static route entry for") + " '" + section[f].value + "'"; 
		}
	}).filter(function(x){ return x; }); 	
}); 

UCI.network.$registerSectionType("route6", {
	"interface": 			{ dvalue: "", type: String }, 
	"target": 				{ dvalue: "", type: String, validator: UCI.validators.IP6AddressValidator, required: true }, 
	"gateway": 				{ dvalue: "", type: String, validator: UCI.validators.IP6AddressValidator },
	"metric": 				{ dvalue: 0, type: Number },
	"mtu": 					{ dvalue: undefined, type: Number }
}, function(section){
	if(!section) return;
	if(section.interface.value == "") return gettext("Please specify interface for ipv6 route!"); 
	if(section.target.value == "") return gettext("Please specify target for ipv6 route!"); 
	return null; 
}); 

UCI.network.$registerSectionType("switch", {
	"name": 	{ dvalue: "", type: String },
	"reset":	{ dvalue: undefined, type: Boolean }, 
	"enable_vlan": { dvalue: true, type: Boolean },
	"enable": 	{ dvalue: false, type: Boolean }
}); 

UCI.network.$registerSectionType("switch_vlan", {
	"displayname": { dvalue: "", type: String },
	"vlan":		{ dvalue: 0, type: Number }, 
	"device": 	{ dvalue: "", type: String },
	"ports": 	{ dvalue: "", type: String }
}); 

UCI.network.$registerSectionType("switch_port_label", {
	"name": 	{ dvalue: "", type: String }, 
	"id": 		{ dvalue: undefined, type: Number }
}); 

UCI.network.$registerSectionType("switch_port", {
	"port": 	{ dvalue: 0, type: Number }, 
	"pvid": 	{ dvalue: 0, type: Number }
}); 

UCI.$registerConfig("hosts");
UCI.hosts.$registerSectionType("host", {
	"device":            { dvalue: "", type: String },
	"ipaddr":               { dvalue: "", type: String, validator: UCI.validators.IPAddressValidator },
	"name": 			{ dvalue: "", type: String }, // deprecated!
	"names": 			{ dvalue: [], type: Array }, 
	"manufacturer":             { dvalue: "", type: String },
	"hostname":		{ dvalue: "", type: String}, 
	"macaddr":		{ dvalue: "", type: String, match: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/}
}, function(host){
	if(host.ipaddr.value == "") return gettext("Host ip address can not be empty!");
	if(host.names.value.length == 0) return gettext("Host must have at least one hostname!"); 
	if(UCI.hosts["@host"] && UCI.hosts["@host"].find(function(x){ return x != host && x.ipaddr.value == host.ipaddr.value; })) return gettext("An entry for host already exists: ")+host.ipaddr.value; 
	return null; 
}); 

UCI.juci.$registerSectionType("network", {
	"wan4_interface": 	{ dvalue: "wan", type: String }, // default wan4 interface name 
	"wan6_interface": 	{ dvalue: "wan6", type: String }, // default wan6 interface name 
	"voice_interface": 	{ dvalue: "wan", type: String }, 
	"iptv_interface": 	{ dvalue: "wan", type: String }
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
.controller("InternetNetworkPage", function($scope, $uci, $rpc, $network, $ethernet, $tr, gettext, networkConnectionCreate){
	$scope.data = {}; 
	
	$ethernet.getAdapters().done(function(devices){
		$scope.devices = devices; 
		
		$network.getNetworks().done(function(nets){
			$scope.networks = nets.filter(function(x){ 
				if(x.defaultroute.value) $scope.data.wan_network = x; 
				return x.ifname.value != "lo" 
			}); 
			$scope.networks = $scope.networks.map(function(net){ 
				net.addedDevices = []; 
				var addedDevices = net.ifname.value.split(" "); 
				//net.$type_editor = "<network-connection-proto-"+net.type.value+"-edit/>";
				net.addableDevices = devices
					.filter(function(dev){ 
						var already_added = addedDevices.find(function(x){ 
							return x == dev.id; 
						}); 
						if(!already_added){
							return true; 
						} else {
							net.addedDevices.push( { label: dev.name, value: dev.id }); 
							return false; 
						}
					})
					.map(function(dev){ 
						return { label: dev.name, value: dev.id }; 
					}); 
				return net; 
			}); 
			$scope.$apply(); 
		}); 
	}); 
	
	$scope.onGetItemTitle = function(i){
		return i[".name"]; 
	}
	
	$scope.onAddConnection = function(){
		networkConnectionCreate.show().done(function(data){
			$uci.network.$create({
				".type": "interface",
				".name": data.name, 
				"type": data.type
			}).done(function(interface){
				$scope.current_connection = interface; 
				$scope.networks.push(interface); 
				$scope.$apply(); 
			}); 
		});
	}
	
	$scope.onDeleteConnection = function(conn){
		if(!conn) alert($tr(gettext("Please select a connection in the list!"))); 
		if(confirm($tr(gettext("Are you sure you want to delete this connection?")))){
			conn.$delete().done(function(){
				$scope.networks = $scope.networks.filter(function(net){
					return net[".name"] != conn[".name"]; 
				}); 
				$scope.current_connection = null; 
				$scope.$apply(); 
			}); 
		}
	}
	
	$scope.onEditConnection = function(conn){
		// set editing widget for the type specific part of the conneciton wizard
		$scope.current_connection = conn; 
		
	}
	
	$scope.onCancelEdit = function(){
		$scope.current_connection = null; 
	}
	
	$scope.onAddDevice = function(net, dev){
		if(!dev) return; 
		var devs = {}; 
		net.ifname.value.split(" ").map(function(name){ devs[name] = name; }); 
		devs[dev] = dev; 
		net.ifname.value = Object.keys(devs).join(" "); 
		net.addedDevices = Object.keys(devs).map(function(x){ return { label: x, value: x }; }); 
	}
	
	$scope.onRemoveDevice = function(net, name){
		console.log("removing device "+name+" from "+net.ifname.value); 
		var items = net.ifname.value.split(" ").filter(function(x){ return x != name; }); 
		net.addedDevices = items.map(function(x){ return {label: x, value: x}; }); 
		net.ifname.value = items.join(" "); 
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
.controller("InternetLANRoutesPage", function($scope, $uci, $network){
	$network.getNetworks().done(function(lans){
		$scope.routes = $uci.network["@route"]; 
		$scope.routes6 = $uci.network["@route6"]; 
		$scope.allNetworks = lans.filter(function(net){
			return net[".name"] != "loopback"; 
		}).map(function(net){
			return { label: net[".name"], value: net[".name"] }; 
		}); 
		$scope.$apply(); 
	}); 

	$scope.onAddRoute = function(){
		$uci.network.$create({
			".type": "route"
		}).done(function(route){
			$scope.$apply(); 
		}); 
	}

	$scope.onDeleteRoute = function(route){
		if(!route) return; 
		route.$delete().done(function(){
			$scope.$apply(); 
		}); 
	}
	
	$scope.onAddRoute6 = function(){
		$uci.network.$create({
			".type": "route6"
		}).done(function(route){
			$scope.$apply(); 
		}); 
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
.controller("InternetServicesPage", function($scope){
	
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
.controller("NetifdStatusClientsPage", function($scope, $network, $firewall){
	$network.getConnectedClients().done(function(clients){
		$scope.clients = []; 
		// TODO: this is duplicate of what is in overview-net widget. We need a better way to list lan clients without treating lan as special network. 
		// TODO: this is not static. Need to find a way to more reliably separate lan and wan so we can list lan clients from all lans without including wans. 
		$firewall.getLanZones().done(function(lan_zone){
			if(!lan_zone) { console.error("no lan zone found in firewall config!"); return; }

			$rpc.network.interface.dump().done(function(stats){
				var interfaces = stats.interface; 
				lan_zone.map(function(zone){
					zone.network.value.map(function(net){
						var iface = interfaces.find(function(x){ return x.interface == net }); 
						if(!iface) return; 
					
						clients.filter(function(cl) { return cl.device == iface.l3_device; })
						.map(function(cl){
							cl._display_html = "<"+cl._display_widget + " ng-model='client'/>"; 
							$scope.clients.push(cl);  
						}); 
					});
				});
				$scope.$apply(); 
			}); 
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
.controller("NetifdVlanConfigPage", function($scope, $uci){
	$uci.$sync("network").done(function(){
		$scope.vlans = $uci.network["@switch_vlan"]; 
		$scope.$apply(); 
	}); 
	
	$scope.onAddVlan = function(){
		$uci.network.$create({
			".type": "switch_vlan"
		}).done(function(interface){
			$scope.$apply(); 
		}); 
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
.controller("StatusNATPageCtrl", function($scope, $rpc, $tr, $network, gettext){
	$scope.order = function(pred){
		$scope.predicate = pred; 
		$scope.reverse = ($scope.predicate === pred) ? !$scope.reverse : false;
	}

	$network.getNetworkLoad().done(function(load){
		$scope.load = load; 
		$scope.$apply(); 
	});
	
	$network.getNatTable().done(function(table){
		$scope.connections = table; 
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
.controller("StatusNetworkRoutes", function($scope, $rpc, $tr, $network, gettext){
	$rpc.juci.network.status.arp().done(function(arp_table){
		$scope.arp_table = arp_table.clients; 
		$rpc.juci.network.status.ipv4routes().done(function(ipv4_routes){
			$scope.ipv4_routes = ipv4_routes.routes; 
			$rpc.juci.network.status.ipv6routes().done(function(ipv6_routes){
				$scope.ipv6_routes = ipv6_routes.routes; 
				$scope.$apply(); 
			}); 
		}); 
	}); 
	$rpc.juci.network.status.ipv6neigh().done(function(result){
		$scope.neighbors = result.neighbors; 	
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
.controller("NetifdNetworkStatusPage", function ($scope, $uci, $rpc, gettext) {
	//$scope.expanded = false; 
		
	JUCI.interval.repeat("status.refresh", 2000, function(resume){
		var ports = {}; 
		var ports_by_name = {}; 
		async.series([
			function(next){
				$uci.$sync("network").done(function(){ next(); }); 
			}, 
			function(next){
				// get openwrt port status (sometimes the only way to read port status) 
				if($rpc.juci.swconfig){
					$rpc.juci.swconfig.status().done(function(status){
						status.ports.map(function(p){
							ports[p.id] = p; 
						}); 
						$uci.network["@switch_port_label"].map(function(x){
							var port = ports[x.id.value]; 
							if(port) {
								port.label = x.name.value; 
								ports_by_name[String(x.name.value)] = port; 
							}
						}); 
						next(); 
					}).fail(function(){
						next(); 
					}); 
				} else {
					next(); 
				}
			}, 
			function(next){
				$rpc.network.interface.dump().done(function(result){
					_interfaces = result.interface.filter(function(x){
						// filter out everything that is not an interface in the config (this will currently remove aliases as well)
						if(!$uci.network["@interface"].find(function(j){ return j[".name"] == x.interface;})) return false; 
						return x.interface != "loopback"; // filter out loopback. Is there any use case where we would want it? 
					}).map(function(x){
						// figure out correct default gateway
						if(x.route) x._defaultroute4 = x.route.find(function(r){ return r.target == "0.0.0.0" });
						if($uci.network[x.interface]) x._config = $uci.network[x.interface]; 
						return x; 
					}); 
				}).always(function(){
					next(); 
				}); 
			}, 
			function(next){
				var sections = []; 
				_interfaces.map(function(i){
					sections.push({
						name: i.interface, 
						interface: i
					}); 
				}); 
				for(var c = 0; c < sections.length; c++){
					var sec = sections[c]; 
					// TODO: this is wrong way to do this, but we have no other way to check wan status atm.
					if(sec.interface.interface == "wan" && ports_by_name["WAN"]){
						if(ports_by_name["WAN"].state == "down") sec.interface.up = false; 
					}
					//-------------
					if(sec.interface.up) {
						sec.status = "ok"; 
						sec.interface._status_text = gettext("UP"); 
						sec.interface._status_class = "success"; 
					} else if(sec.interface.pending) {
						sec.status = "progress"; 
						sec.interface._status_text = gettext("PENDING"); 
						sec.interface._status_class = "warning"; 
					} else if(!sec.interface.up) {
						sec.status = "error"; 
						sec.interface._status_text = gettext("DOWN"); 
						sec.interface._status_class = "default"; 
					} else {
						sec.status = "error"; 
						sec.interface._status_text = gettext("ERROR"); 
						sec.interface._status_class = "danger"; 
					}
				} 
				$scope.sections = sections.filter(function(x){ return x.interface !== undefined; });//.sort(function(a, b) { return a.interface.up > b.interface.up; }); 
				$scope.$apply(); 
				next(); 
			}/*, 
			function(next){
				$broadcomDsl.status().done(function(result){
					switch(result.dslstats.status){
						case 'Idle': $scope.dsl_status = 'disabled'; break; 
						case 'Showtime': $scope.dsl_status = 'ok'; break; 
						default: $scope.dsl_status = 'progress'; break; 
					}
					$scope.dslinfo = result.dslstats; 
					$scope.$apply(); 
					next(); 
				});
			}*/
		], function(){
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
.controller("bridgeDevicePicker", function($scope, $modalInstance, devices, gettext){
	$scope.devices = devices; 
	$scope.data = {}; 
	$scope.ok = function () {
		if(!$scope.data.device) {
			alert(gettext("You need to select a device to add!")); 
			return; 
		}
		$modalInstance.close($scope.data.device);
	};

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
})

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
.directive("netifdSwitchVlanEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/netifd-switch-vlan-edit.html", 
		controller: "netifdSwitchVlanEdit", 
		scope: {
			vlan: "=ngModel"
		},
		replace: true, 
		require: "^ngModel"
	 };  
}).controller("netifdSwitchVlanEdit", function($scope, $ethernet, $uci){	
	$scope.allSwitchPorts = []; 
	$scope.selectedSwitchPorts = []; 
	
	$scope.onSelectionChanged = function(){
		if(!$scope.vlan) return; 
		$scope.vlan.ports.value = $scope.selectedSwitchPorts.filter(function(x){ return x.selected; }).map(function(x){ return x.value; }).join(" ");  
	}

	// will load uci value into local variables
	function loadConfig(){
		var vlan = $scope.vlan; 
		if(!vlan) return; 
		// TODO: do we always need CPU port (5) to be tagged? 
		var list = vlan.ports.value.split(" ").filter(function(x){ return x != "5t"; });  
		// reset all selections before we set them again
		$scope.allSwitchPorts.map(function(x){ x.selected = false; }); 
		$scope.selectedSwitchPorts = list.map(function(x){ 
			return $scope.allSwitchPorts.find(function(y){ return y.value == parseInt(x); }); 
		}).filter(function(x){ if(x) x.selected = true; return x != null; }); 
	}

	// load config
	$uci.$sync("network").done(function(){
		$scope.allSwitchPorts = $uci.network["@switch_port_label"].map(function(x){
			return { label: x.name.value, value: x.id.value }; 
		}); 
		$scope.allBaseDevices = $uci.network["@switch"].map(function(d){
			return { label: d.name.value, value: d.name.value }; 
		}); 
		loadConfig(); 
		$scope.$apply(); 
	}); 

	// when model changes, reload the values
	$scope.$watch("vlan", function onNetworkVLANModelChanged(vlan){
		loadConfig(); 
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
.directive("networkClientEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-client-edit.html", 
		controller: "networkClientEdit", 
		scope: {
			opts: "=ngModel"
		},
		replace: true, 
		require: "^ngModel"
	 };  
}).controller("networkClientEdit", function($scope, $ethernet, $location){	
	$scope.closeDialog = function(){
		if(!$scope.opts || !$scope.opts.modal) return; 
		$scope.opts.modal.dismiss("cancel"); 
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
.directive("networkClientLanDisplayWidget", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-client-lan-display-widget.html", 
		controller: "networkClientLanDisplayWidget", 
		scope: {
			client: "=ngModel"
		},
		replace: true, 
		require: "^ngModel"
	 };  
}).controller("networkClientLanDisplayWidget", function($scope){	

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
.factory("networkConnectionCreate", function($modal, $network){
	return {
		show: function(opts){
			var def = $.Deferred(); 
			var modalInstance = $modal.open({
				animation: true,
				templateUrl: 'widgets/network-connection-create.html',
				controller: 'networkConnectionCreateModal',
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
.controller("networkConnectionCreateModal", function($scope, $modalInstance, gettext){
	$scope.data = {}; 
	$scope.interfaceTypes = [
		{ label: "Standalone", value: "" },
		{ label: "AnyWAN", value: "anywan"}, 
		{ label: "Bridge", value: "bridge"}
	]; 
	$scope.ok = function () {
		if(!$scope.data.name) {
			alert(gettext("You need to specify both name and type!")); 
			return; 
		}
		$modalInstance.close($scope.data);
	};

	$scope.cancel = function () {
    	$modalInstance.dismiss('cancel');
	};
})

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionDnsConfig", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-dns-config.html",
		scope: {
			interface: "=ngModel"
		},
		controller: "networkConnectionDnsConfig",
		replace: true,
		require: "^ngModel"
	 };
})
.controller("networkConnectionDnsConfig", function($scope, $uci, $network, $rpc, $log, gettext){
	$scope.data = [];
	$scope.$watch("interface", function onNetworkDNSModelChanged(){
		if(!$scope.interface || !$scope.interface.dns) return;
		$scope.data = $scope.interface.dns.value.map(function(dns){
			return { value:dns}
		});
		$scope.interface.dns.validator = new dnsValidator;
	}, false);
	var ipv4validator = new $uci.validators.IP4AddressValidator;
	function dnsValidator(){
		this.validate = function(data){
			if(data.value.find(function(dns){
				if( ipv4validator.validate({value:dns}) != null) return true;
				return false;
			}) != undefined) return "All DNS-servers must be valid";
			if(duplicatesInData()) return "All DNS-servers must be unique"
			return null;
		};
	};
	$scope.addDns = function(dns){ $scope.data.push({ value: ""})};
	$scope.removeDns = function(index){ if($scope.data[index]) $scope.data.splice(index, 1);};
	$scope.$watch("data", function onNetworkDNSDataChanged(){
		if(!$scope.data || !$scope.interface || !$scope.interface.dns) return;
		$scope.interface.dns.value = $scope.data.map(function(x){ return x.value});
	}, true);
	function duplicatesInData(){
		var dnslist = $scope.data.map(function(x){ return x.value;});
		var sorted_list = dnslist.sort();
		for(var i = 0; i < sorted_list.length -1; i++){
			if(sorted_list[i+1] == sorted_list[i]) return true;
		}
		return false;
	};
});

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionEdit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionEdit", function($scope, $uci, $network, $rpc, $log, $tr, gettext, $juciDialog){
	$scope.expanded = true; 
	$scope.existingHost = { }; 
	
	$scope.allInterfaceTypes = [
		{ label: $tr(gettext("Standalone")), value: "" }, 
		{ label: $tr(gettext("AnyWAN")), value: "anywan" }, 
		{ label: $tr(gettext("Bridge")), value: "bridge" }
	]; 
	 $scope.showPhysical = function(){
	 	if(!$scope.interface) return false;
	 	return $scope.allProtocolTypes.find(function(x){ if(x.value == $scope.interface.proto.value) return x.physical;}) != undefined;
	};
	
	$scope.allProtocolTypes = [
		{ label: $tr(gettext("Unmanaged")),								value: "none",		physical: true },
		{ label: $tr(gettext("Static Address")), 						value: "static",	physical: true }, 
		{ label: $tr(gettext("DHCP v4")), 								value: "dhcp",		physical: true }, 
		{ label: $tr(gettext("DHCP v6")), 								value: "dhcpv6",	physical: true }, 
		{ label: $tr(gettext("PPP")), 									value: "ppp",		physical: false }, 
		{ label: $tr(gettext("PPP over Ethernet")), 					value: "pppoe", 	physical: true }, 
		{ label: $tr(gettext("PPP over ATM")), 							value: "pppoa", 	physical: true }, 
		{ label: $tr(gettext("3G (ppp over GPRS/EvDO/CDMA or UTMS)")), 	value: "3g", 		physical: false }, 
		{ label: $tr(gettext("4G (LTE/HSPA+)")), 						value: "4g", 		physical: false }, 
		//{ label: $tr(gettext("QMI (USB modem)")), 						value: "qmi", 		physical: true }, 
		//{ label: $tr(gettext("NCM (USB modem)")), 						value: "ncm", 		physical: true }, 
		//{ label: $tr(gettext("HNET (self-managing home network)")), 	value: "hnet", 		physical: true }, 
		{ label: $tr(gettext("Point-to-Point Tunnel")), 				value: "pptp", 		physical: false }, 
		{ label: $tr(gettext("IPv6 tunnel in IPv4 (6in4)")), 			value: "6in4", 		physical: false }, 
		{ label: $tr(gettext("IPv6 tunnel in IPv4 (6to4)")), 			value: "6to4", 		physical: false }, 
		//{ label: $tr(gettext("Automatic IPv6 Connectivity Client")),	value: "aiccu", 	physical: false }, 
		{ label: $tr(gettext("IPv6 rapid deployment")), 				value: "6rd", 		physical: false }, 
		{ label: $tr(gettext("Dual-Stack Lite")), 						value: "dslite", 	physical: false }, 
		{ label: $tr(gettext("PPP over L2TP")), 						value: "l2tp", 		physical: false }//, 
		//{ label: $tr(gettext("Relayd Pseudo Bridge")),					value: "relay", 	physical: true }, 
		//{ label: $tr(gettext("GRE Tunnel over IPv4")), 					value: "gre", 		physical: true }, 
		//{ label: $tr(gettext("Ethernet GRE over IPv4")), 				value: "gretap", 	physical: true }, 
		//{ label: $tr(gettext("GRE Tunnel over IPv6")), 					value: "grev6", 	physical: true }, 
		//{ label: $tr(gettext("Ethernet GRE over IPv6")), 				value: "grev6tap", 	physical: true },
	]; 
	$rpc.juci.network.protocols().done(function(data){
		$scope.protocolTypes = $scope.allProtocolTypes.filter(function(x){
			if(x.value == "static" || x.value == "none") return true; //should allways be there
			return data.protocols.find(function(p){ return p == x.value }) != undefined;
		});
	});
	var standard_exc = ["macaddr","mtu","auto","metric"];
	var exceptions = {
		"none":		["ifname","type"],
		"static":	["ifname","type","ipaddr","netmask","gateway","broadcast","ip6addr","ip6gw","ip6assign","ip6hint","ip6prefix","dns"],
		"dhcp":		["ifname","type","broadcast","hostname","clientid","vendorid","dns","peerdns","defaultroute"],
		"dhcpv6":	["ifname","type","reqaddress","reqprefix","clientid","dns","defaultroute","peerdns","ip6prefix"],
		"ppp":		["device","username","password","_keepalive_interval","_keepalive_failure","demand","defaultrout","peerdns","dns","ipv6"],
		"pppoe":	["ifname","username","password","ac","service","_keepalive_interval","_keepalive_failure","demand","defaultroute","peerdns","dns","ipv6"],
		"pppoa":	["ifname","username","password","_keepalive_interval","_keepalive_failure","demand","defaultroute","peerdns","dns","ipv6"],
		"3g":		["device","service","apn","pincode","username","password","_keepalive_interval","_keepalive_failure","demand","defaultroute","peerdns","dns","ipv6"],
		"4g":		["device","service","comdev","modem","apn","pincode","username","password","hostname","broadcast","defaultroute","peerdns","dns","clientid","vendorid"],
		"pptp":		["server","username","password","defaultroute","peerdns","dns","_keepalive_interval","_keepalive_failure","demand"],
		"6in4":		["ipaddr","peeraddr","ip6addr","ip6prefix","_update","tunelid","username","password","defaultroute","ttl"],
		"6to4":		["ipaddr","defaultroute","ttl"],
		"6rd":		["ipaddr","peeraddr","ip6prefix","ip6prefixlen","ip4prefixlen","defaultroute","ttl"],
		"dslite":	["peeraddr","ip6addr","tunlink","ttl"],
		"l2tp":		["server","username","password","ipv6","defaultroute","peerdns","dns"]
	}

	$scope.ifstatus = function(){
		if(!$scope.interface || !$scope.interface.$info || $scope.interface.$info.pending == undefined || $scope.interface.$info.up == undefined) return $tr(gettext("ERROR"));
		return ($scope.interface.$info.pending) ? $tr(gettext("PENDING")) : (($scope.interface.$info.up) ? $tr(gettext("UP")) : $tr(gettext("DOWN")));
	};
	$scope.onChangeProtocol = function(value, oldvalue){
		//TODO maby change confirm to juciDialog
		if(value == oldvalue) return;
		if(confirm($tr(gettext("Are you sure you want to switch? Your settings will be lost!")))){
			if(exceptions[value]){
				var exc = exceptions[value].concat(standard_exc);
			}
			$scope.interface.$reset_defaults(exc || []);
			setProto(value);
			return true;
		}
		return false;
	};

	function setProto(proto){
		$scope.interface.$proto_editor = "<network-connection-proto-"+proto+"-edit ng-model='interface'/>"; 
		$scope.interface.$proto_editor_ph = "<network-connection-proto-"+proto+"-physical-edit ng-model='interface' protos='allInterfaceTypes' />"; 
		$scope.interface.$proto_editor_ad = "<network-connection-proto-"+proto+"-advanced-edit ng-model='interface' />"; 
	};	
	JUCI.interval.repeat("load-info", 5000, function(done){
		if(!$scope.interface || !$rpc.network.interface || !$rpc.network.interface.dump) return;
		$rpc.network.interface.dump().done(function(ifaces){
			$scope.interface.$info = ifaces.interface.find(function(x){ return x.interface == $scope.interface[".name"]; });
			$scope.$apply();
		});
	});
	$scope.$watch("interface.type.value", function onNetworkConnectionTypeChanged(value){
		if(!$scope.interface) return; 
		$scope.interface.$type_editor = "<network-connection-type-"+($scope.interface.type.value||'none')+"-edit ng-model='interface'/>"; 
	}); 
	$scope.$watch("interface", function onNetworkInterfaceModelChanged(){
		if(!$scope.interface) return; 
		setProto($scope.interface.proto.value);
		$scope.interface.$type_editor = "<network-connection-type-"+($scope.interface.type.value||'none')+"-edit ng-model='interface'/>"; 
	}, false); 
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
.factory("networkConnectionPicker", function($modal, $network){
	return {
		show: function(opts){
			var def = $.Deferred(); 
			var exclude = {}; // allready added nets that will be excluded from the list
			if(!opts) opts = {}; 
			if(opts.exclude && opts.exclude instanceof Array) opts.exclude.map(function(x){ exclude[x[".name"]] = true; }); 
			$network.getNetworks().done(function(nets){
				var modalInstance = $modal.open({
					animation: true,
					templateUrl: 'widgets/network-connection-picker.html',
					controller: 'networkConnectionPickerModal',
					resolve: {
						nets: function () {
							return nets.filter(function(x) { return x[".name"] != "loopback" && !(x[".name"] in exclude); }).map(function(net){
								return { label: net[".name"], value: net[".name"] }; 
							}); 
						}
					}
				});

				modalInstance.result.then(function (data) {
					setTimeout(function(){ // do this because the callback is called during $apply() cycle
						def.resolve(nets.find(function(x){ return x[".name"] == data; })); 
					}, 0); 
				}, function () {
					console.log('Modal dismissed at: ' + new Date());
				});
			}); 
			return def.promise(); 
		}
	}; 
})
.controller("networkConnectionPickerModal", function($scope, $modalInstance, $wireless, nets, gettext){
	$scope.networks = nets; 
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
.directive("networkConnectionProto3gEdit", function($compile){
	return {
		scope: {
			interface: "=ngModel"
		}, 
		templateUrl: "/widgets/network-connection-proto-3g-edit.html", 
		controller: "networkConnectionProto3gEdit", 
		replace: true
	 };  
})
.controller("networkConnectionProto3gEdit", function($scope, $network, $modal, $tr, gettext){
	$scope.showPass = false;
	$scope.togglePasswd = function(){
		$scope.showPass = !$scope.showPass;
	};
	$rpc.juci.modems.list().done(function(data){
		$scope.allModemDevices = data.modems.map(function(x){return {label: x, value: x}});
		$scope.$apply();
	});
	$scope.serviceTypes = [
		{ label: $tr(gettext("UMTS/GPRS")),	value: "umts" },
		{ label: $tr(gettext("UMTS only")),	value: "umts_only" },
		{ label: $tr(gettext("GPRS only")),	value: "gprs_only" },
		{ label: $tr(gettext("GPRS only")),	value: "evdo" },
	];
})
.directive("networkConnectionProto3gAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-3g-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
}); 

//! Author: Martin K. Schröder <mkschreder.uk@gmail.com>

JUCI.app
.directive("networkConnectionProto4gEdit", function($compile){
	return {
		scope: {
			interface: "=ngModel"
		}, 
		templateUrl: "/widgets/network-connection-proto-4g-edit.html", 
		controller: "networkConnectionProto4gEdit", 
		replace: true
	 };  
})
.controller("networkConnectionProto4gEdit", function($scope, $network, $modal, $tr, gettext){
	$scope.device = {};
	$rpc.juci.modems.list4g().done(function(data){
		if(data.info) return;
		$scope.modems = data.modems;
		$scope.allModemDevices = data.modems.map(function(x){ return { label: x.name, value:x.service+":"+x.dev+":"+x.ifname }});
		$scope.$apply();
	});
	$scope.onModemChange = function(value){
		if(!$scope.interface) return;
		var opts = String(value).split(":");
		if(opts.length < 3) return;
		$scope.interface.service.value = opts[0];
		$scope.interface.comdev.value = "/dev/"+opts[1];
		$scope.interface.ifname.value = opts[2];
	};
})
.directive("networkConnectionProto4gAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-4g-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
}); 

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProto6in4Edit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-6in4-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		controller: "networkConnectionProto6in4EditCtrl",
		require: "^ngModel"
	};
})
.controller("networkConnectionProto6in4EditCtrl", function($scope){
	$scope.showPass = false;
	$scope.togglePass = function(){$scope.showPass = !$scope.showPass;};
	//TODO: when on apply excists add a check if _update.value == false set tunnelid, username, password.value to empty string
})
.directive("networkConnectionProto6in4AdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-6in4-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
});

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProto6rdEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-6rd-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
})
.directive("networkConnectionProto6rdAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-6rd-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
});

//! Author Reidar Cederqivst <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProto6to4Edit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-6to4-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
})
.directive("networkConnectionProto6to4AdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-6to4-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
});


//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com> 

JUCI.app
.directive("networkConnectionProtoDhcpEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-proto-dhcp-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionProtoDhcpEdit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionProtoDhcpEdit", function($scope, $uci, $network, $rpc, $log, gettext){
}).directive("networkConnectionProtoDhcpPhysicalEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-standard-physical.html",
		scope: {
			interface: "=ngModel",
			protos: "="
		},
		replace: true,
		require: "^ngModel"
	};
}).directive("networkConnectionProtoDhcpAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-dhcp-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel",
		controller: "networkConnectionProtoDhcpAdvancedEditCtrl"
	};
}).controller("networkConnectionProtoDhcpAdvancedEditCtrl", function($scope){
	$scope.dnslist = [];
	$scope.$watch("interface", function onNetworkDHCPModelChanged(){
		if(!$scope.interface) return;
		$scope.interface.dns.value = $scope.interface.dns.value.filter(function(x){ return x != "" });
		$scope.dnslist = $scope.interface.dns.value.map(function(x){ return { text: x }});
		$scope.interface.reqopts.$error = null;
	}, false);
	$scope.onTagsChange = function(){
		$scope.interface.dns.value = $scope.dnslist.map(function(x){return x.text;});
	};
	$scope.evalDns = function(tag){
		var parts = String(tag.text).split(".");
		if(parts.length != 4) return false;
		for(var i = 0; i < 4; i++){	
			var isnum = /^[0-9]+$/.test(parts[i]);
			if(!isnum) return false;
			var num = parseInt(parts[i]);
			if(num < 0 || num > 255) return false;
		}
		return true;
	};
	$scope.evalReqopts = function(tag){
		var opts = $scope.interface.reqopts.value.split(" ").filter(function(x){ return x != ""}).map(function(x){ return parseInt(x)});
		if(opts.find(function(opt){ 
			if(opt > 0 && opt < 255  ) return false;
			return true;
		}) != undefined){
			$scope.interface.reqopts.$error="Must be space separated integer between 1 and 254";
		}else{
			for(var i = 0; i < opts.length; i ++){
				if(opts.lastIndexOf(opts[i]) != i) break;
			}
			if(i < opts.length){
				$scope.interface.reqopts.$error="No duplicat values"
			}else{
				$scope.interface.reqopts.$error=null;
			}
		}
	};
}); 

//! Author Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProtoDhcpv6Edit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-proto-dhcpv6-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionProtoDhcpv6Edit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionProtoDhcpv6Edit", function($scope, $uci, $network, $rpc, $log, $tr, gettext){
	$scope.allReqAddrTypes = [
		{ label: $tr(gettext("Try")), value: "try" }, 
		{ label: $tr(gettext("Force")), value: "force" }, 
		{ label: $tr(gettext("None")), value: "none" }
	]; 
	$scope.allPrefixReqTypes = [
		{ label: "48", value: "48" }, 
		{ label: "52", value: "52" }, 
		{ label: "56", value: "56" }, 
		{ label: "60", value: "60" }, 
		{ label: "64", value: "64" }, 
		{ label: $tr(gettext("Auto")), value: "auto" }, 
		{ label: $tr(gettext("Disabled")), value: "no" }
	]; 
})
.directive("networkConnectionProtoDhcpv6PhysicalEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-standard-physical.html",
		scope: {
			interface: "=ngModel",
			protos: "="
		},
		replace: true,
		require: "^ngModel"
	};
})
.directive("networkConnectionProtoDhcpv6AdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-dhcpv6-advanced-edit.html",
		scope:	{
			interface: "=ngModel"
		},
		controller: "networkConnectionProtoDhcpv6AdvancedEdit",
		replace: true,
		require: "^ngModel"
	};
})
.controller("networkConnectionProtoDhcpv6AdvancedEdit", function($scope){
	
});

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProtoDsliteEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-dslite-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
})
.directive("networkConnectionProtoDsliteAdvancedEdit", function(){
	return { 
		templateUrl: "/widgets/network-connection-proto-dslite-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		controller: "networkConnectionProtoDsliteAdvancedEditCtrl",
		require: "^ngModel"
	};
})
.controller("networkConnectionProtoDsliteAdvancedEditCtrl", function($scope, $uci){
	$scope.allInterfaces = $uci.network["@interface"].map(function(interf){ return { label: String(interf[".name"]).toUpperCase(), value: interf[".name"]}}).filter(function(x){ return x.value != "loopback" });
	$scope.$watch("interface", function onNetworkProtoDSliteModelChanged(){
		if(!$scope.interface || !$scope.allInterfaces) return;
		if($scope.allInterfaces.find(function(x){ return x.value == $scope.interface.tunlink.value }) == undefined) $scope.interface.tunlink.value = "";
	}, false);
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
.directive("networkConnectionProtoHnetEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-proto-dhcp-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionProtoHnetEdit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionProtoHnetEdit", function($scope, $uci, $network, $rpc, $log, gettext){
	
}); 

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProtoL2tpEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-l2tp-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		controller: "networkConnectionProtoL2tpEditCtrl",
		require: "^ngModel"
	};
})
.controller("networkConnectionProtoL2tpEditCtrl", function($scope){
	$scope.showPass = false;
	$scope.toggleShowPass = function(){$scope.showPass = !$scope.showPass;};
})
.directive("networkConnectionProtoL2tpAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-l2tp-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
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
.directive("networkConnectionProtoNcmEdit", function($compile){
	return {
		scope: {
			interface: "=ngModel"
		}, 
		templateUrl: "/widgets/network-connection-proto-Ncm-edit.html", 
		controller: "networkConnectionProtoNcmEdit", 
		replace: true
	 };  
})
.controller("networkConnectionProtoNcmEdit", function($scope, $network, $modal, $tr, gettext){
	
}); 



JUCI.app
.directive("networkConnectionProtoNoneEdit", function(){
	return {
		replace: true,
		controller: "networkConnectionProtoNoneEditCtrl"
	};
})
.directive("networkConnectionProtoNonePhysicalEdit", function(){
	return {
		template: "<div><h2 translate>Bridge devices</h2><network-connection-type-bridge-edit ng-model=\"interface\"></network-connection-type-bridge-edit></div>",
		scope: {
			interface: "=ngModel",
			protos: "="
		},
		replace: true,
		require: "^ngModel"
	};
})
.controller("networkConnectionProtoNoneEditCtrl", function($scope){
	$scope.$watch("interface", function onNetworkConnectionInterfaceChanged(){
		if(!$scope.interface) return;
		$scope.interface.type.value = "bridge";
	}, false);
});

//! Author Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProtoPppEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-proto-ppp-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionProtoPppEdit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionProtoPppEdit", function($scope, $uci, $network, $rpc, $log, gettext){
	$scope.modemDevices = [];
	$rpc.juci.modems.list().done(function(data){
		$scope.modemDevices = data.modems.map(function(x){ return { label:x, value:x}});
		$scope.$apply();
	});
})
.directive("networkConnectionProtoPppAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-ppp-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
});

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com> 

JUCI.app
.directive("networkConnectionProtoPppoaEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-proto-pppoa-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionProtoPppoaEdit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionProtoPppoaEdit", function($scope, $uci, $network, $rpc, $log, gettext){
	
})
.directive("networkConnectionProtoPppoaPhysicalEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-standalone-physical.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
})
.directive("networkConnectionProtoPppoaAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-pppoa-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
});

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProtoPppoeEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-proto-pppoe-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionProtoPppoeEdit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionProtoPppoeEdit", function($scope, $uci, $network, $rpc, $log, gettext){
	$scope.$watch("interface", function onNetworkPppoeModelChanged(){
		if(!$scope.interface) return;
		$scope.interface.type.value = "";
	}, false);
})
.directive("networkConnectionProtoPppoeAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-pppoe-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
}).
directive("networkConnectionProtoPppoePhysicalEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-standalone-physical.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
}); 

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProtoPptpEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-pptp-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		controller: "networkConnectionProtoPptpEditCtrl",
		require: "^ngModel"
	};
})
.controller("networkConnectionProtoPptpEditCtrl", function($scope){
	$scope.showPass = false;
	$scope.togglePass = function(){$scope.showPass = !$scope.showPass;};
})
.directive("networkConnectionProtoPptpAdvancedEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-proto-pptp-advanced-edit.html",
		scope: {
			interface: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
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
.directive("networkConnectionProtoQmiEdit", function($compile){
	return {
		scope: {
			interface: "=ngModel"
		}, 
		templateUrl: "/widgets/network-connection-proto-Qmi-edit.html", 
		controller: "networkConnectionProtoQmiEdit", 
		replace: true
	 };  
})
.controller("networkConnectionProtoQmiEdit", function($scope, $network, $modal, $tr, gettext){
	
}); 


//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkConnectionProtoStaticEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/network-connection-proto-static-edit.html", 
		scope: {
			interface: "=ngModel"
		}, 
		controller: "networkConnectionProtoStaticEdit", 
		replace: true, 
		require: "^ngModel"
	 };  
})
.controller("networkConnectionProtoStaticEdit", function($scope, $uci, $network, $rpc, $log, $tr, gettext){
	$scope.$watch("interface", function onNetworkStaticModelChanged(){
		if(!$scope.interface) return;
		$scope.ip.type = ($scope.interface.ip6assign.value == "" ? "alloc" : "assign");
		$scope.interface.dns.value = $scope.interface.dns.value.filter(function(x){ if(x == "") return false; return true});;
		$scope.dnslist = $scope.interface.dns.value.map(function(x){return { text:x }});
	}); 
	$scope.interface_types = [
		{ label: $tr(gettext("Uplink")),	 value: false },
		{ label: $tr(gettext("Local Link")), value: true }
	];
	$scope.ip = {};
	$scope.ip.types = [
		{ label: $tr(gettext("Address Allocation")),	value: "alloc" },
		{ label: $tr(gettext("Address Assignment")),	value: "assign" }
	];
	$scope.onTagsChange = function(){
		$scope.interface.dns.value = $scope.dnslist.map(function(x){return x.text;});
	};
	$scope.evalDns = function(tag){
		var parts = String(tag.text).split(".");
		if(parts.length != 4) return false;
		for(var i = 0; i < 4; i++){	
			var isnum = /^[0-9]+$/.test(parts[i]);
			if(!isnum) return false;
			var num = parseInt(parts[i]);
			if(num < 0 || num > 255) return false;
		}
		return true;
	};
	$scope.onAssignChange = function(){
		var isnum = /^[0-9]+$/.test($scope.interface.ip6assign.value);
		while($scope.interface.ip6assign.value != "" && !isnum){
			$scope.interface.ip6assign.value = $scope.interface.ip6assign.value.slice(0, -1);	
		}
	};
	$scope.onAssignmentChange = function(value){
		if(value == "assign"){
			$scope.interface.ip6addr.value = "";
			$scope.interface.ip6gw.value = "";
			$scope.interface.ip6prefix.value = "";
		}else{
			$scope.interface.ip6hint.value = "";
			$scope.interface.ip6assign.value = "";
		}
	};
	
	$scope.$watchCollection("bridgedInterfaces", function onNetworkStaticBridgedChanged(value){
		if(!value || !$scope.interface || !(value instanceof Array)) return; 
		$scope.interface.ifname.value = value.join(" "); 
	}); 
	
})
.directive("networkConnectionProtoStaticPhysicalEdit", function(){
	return {
		templateUrl: "/widgets/network-connection-standard-physical.html",
		scope: {
			interface: "=ngModel",
			protos: "="
		},
		replace: true,
		require: "^ngModel"
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
.directive("networkConnectionTypeAnywanEdit", function($compile){
	return {
		scope: {
			connection: "=ngModel"
		}, 
		controller: "networkConnectionTypeAnywanEdit", 
		templateUrl: "/widgets/network-connection-type-anywan-edit.html", 
		replace: true
	 };  
})
.controller("networkConnectionTypeAnywanEdit", function($scope, $network, $ethernet, $modal, $tr, gettext){
	$scope.getItemTitle = function(dev){
	
		return dev.name + " ("+dev.device+")"; 
	}
	function updateDevices(net){
		if(!net) return;
		$ethernet.getAdapters().done(function(adapters){
			var filtered = adapters.filter(function(dev){
				return !dev.flags || !dev.flags.split(",").find(function(f){ return f == "NOARP"; });
			})
			var wan = filtered.find(function(dev){ return dev.device.match(/^eth[\d]+\.[\d]+$/); });
			if(wan){
				filtered = filtered.filter(function(dev){return wan.device.split(".")[0] != dev.device; });
			}
			var aptmap = {};
			filtered.map(function(apt){ aptmap[apt.device] = apt; });
			net.$addedDevices = ((net.ifname.value != "")?net.ifname.value.split(" "):[])
				.filter(function(x){return x && x != "" && aptmap[x]; })
				.map(function(x){ 
					// return device and delete it from map so the only ones left are the ones that can be added
					var a = aptmap[x];
					delete aptmap[x]; 
					return { name: a.name, device: a.device, adapter: a }; 
				}); 
			net.$addableDevices = Object.keys(aptmap).map(function(k){ return aptmap[k]; }); 
			$scope.$apply(); 
		}); 
	}; updateDevices($scope.connection); 
	
	$scope.$watch("connection", function onNetworkAnywanModelChanged(value){
		if(!value) return; 
		updateDevices(value); 	
	});
	
	
	$scope.onAddBridgeDevice = function(){
		var modalInstance = $modal.open({
			animation: true,
			templateUrl: 'widgets/bridge-device-picker.html',
			controller: 'bridgeDevicePicker',
			resolve: {
				devices: function () {
					return $scope.connection.$addableDevices.map(function(x){
						return { label: x.name + " (" + x.device + ")", value: x.device };
					}); 
				}
			}
		});

		modalInstance.result.then(function (device) {
			console.log("Added device: "+JSON.stringify(device)); 
			var keep_device = false; 
			// remove the device from any other interface that may be using it right now (important!); 
			$network.getNetworks().done(function(nets){
				$ethernet.getAdapters().done(function(adapters){
					nets.filter(function(net){ return net.type.value == "anywan"; }).map(function(net){
						net.ifname.value = net.ifname.value.split(" ").filter(function(dev){ 
							if(dev == device && !confirm($tr(gettext("Are you sure you want to remove device "+dev+" from network "+net['.name']+" and use it in this bridge?")))) {
								keep_device = true; 
								return true; 
							}
							else if(dev == device) return false; 
							return true; 
						}).join(" ");
					}); 
					
					if(keep_device) return; 
					
					$scope.connection.ifname.value += " " + device; 
					$scope.connection.ifname.value.split(" ")
						.filter(function(x){ return x != ""; })
						.map(function(dev_name){
							var dev = adapters.find(function(d){ return d.device == dev_name; }); 
						}); 
					updateDevices($scope.connection);
				}); 
			}); 
		}, function () {
			console.log('Modal dismissed at: ' + new Date());
		});
	}
	
	$scope.onDeleteBridgeDevice = function(adapter){
		if(!adapter) alert(gettext("Please select a device in the list!")); 
		if(confirm(gettext("Are you sure you want to delete this device from bridge?"))){
			$scope.connection.ifname.value = $scope.connection.ifname.value.split(" ").filter(function(name){
				return name != adapter.device; 
			}).join(" "); 
			updateDevices($scope.connection); 
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
.directive("networkConnectionTypeBridgeEdit", function($compile){
	return {
		scope: {
			connection: "=ngModel", 
		}, 
		templateUrl: "/widgets/network-connection-type-bridge-edit.html", 
		controller: "networkConnectionTypeBridgeEdit", 
		replace: true
	 };  
})
.controller("networkConnectionTypeBridgeEdit", function($scope, $network, $ethernet, $modal, $tr, gettext){
	$scope.getItemTitle = function(dev){
	
		return dev.name + " ("+dev.device+")"; 
	}
	function updateDevices(net){
		if(!net) return;
		$ethernet.getAdapters().done(function(adapters){
			var filtered = adapters.filter(function(dev){
				return !dev.flags || !dev.flags.split(",").find(function(f){ return f == "NOARP"; });
			})
			var wan = filtered.find(function(dev){ return dev.device.match(/^eth[\d]+\.[\d]+$/); });
			if(wan){
				filtered = filtered.filter(function(dev){return wan.device.split(".")[0] != dev.device; });
			}
			var aptmap = {};
			filtered.map(function(apt){ aptmap[apt.device] = apt; });
			net.$addedDevices = ((net.ifname.value != "")?net.ifname.value.split(" "):[])
				.filter(function(x){return x && x != "" && aptmap[x]; })
				.map(function(x){ 
					// return device and delete it from map so the only ones left are the ones that can be added
					var a = aptmap[x];
					delete aptmap[x]; 
					return { name: a.name, device: a.device, adapter: a }; 
				}); 
			net.$addableDevices = Object.keys(aptmap).map(function(k){ return aptmap[k]; }); 
			$scope.$apply(); 
		}); 
	}; updateDevices($scope.connection); 
	
	$scope.$watch("connection", function onNetworkBridgeModelChanged(value){
		if(!value) return; 
		updateDevices(value); 	
	});
	
	
	$scope.onAddBridgeDevice = function(){
		var modalInstance = $modal.open({
			animation: true,
			templateUrl: 'widgets/bridge-device-picker.html',
			controller: 'bridgeDevicePicker',
			resolve: {
				devices: function () {
					return $scope.connection.$addableDevices.map(function(x){
						return { label: x.name + " (" + x.device + ")", value: x.device };
					}); 
				}
			}
		});

		modalInstance.result.then(function (device) {
			console.log("Added device: "+JSON.stringify(device)); 
			var keep_device = false; 
			// remove the device from any other interface that may be using it right now (important!); 
			$network.getNetworks().done(function(nets){
				$ethernet.getAdapters().done(function(adapters){
					nets.filter(function(net){ return net.type.value == "bridge"; }).map(function(net){
						net.ifname.value = net.ifname.value.split(" ").filter(function(dev){ 
							if(dev == device && !confirm($tr(gettext("Are you sure you want to remove device "+dev+" from network "+net['.name']+" and use it in this bridge?")))) {
								keep_device = true; 
								return true; 
							}
							else if(dev == device) return false; 
							return true; 
						}).join(" ");
					}); 
					
					if(keep_device) return; 
					$scope.connection.ifname.value += " " + device; 
					$scope.connection.ifname.value.split(" ")
					.filter(function(x){ return x != ""; })
					.map(function(dev_name){
						var dev = adapters.find(function(d){ return d.device == dev_name; }); 
					});
					updateDevices($scope.connection);
				}); 
			}); 
		}, function () {
			console.log('Modal dismissed at: ' + new Date());
		});
	}
	
	$scope.onDeleteBridgeDevice = function(adapter){
		if(!adapter) alert(gettext("Please select a device in the list!")); 
		if(confirm(gettext("Are you sure you want to delete this device from bridge?"))){
			$scope.connection.ifname.value = $scope.connection.ifname.value.split(" ").filter(function(name){
				return name != adapter.device; 
			}).join(" "); 
			updateDevices($scope.connection); 
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

gettext("network.interface.type.none.tab.title");

JUCI.app
.directive("networkConnectionTypeNoneEdit", function($compile){
	return {
		scope: {
			interface: "=ngModel"
		},
		templateUrl: "/widgets/network-connection-type-none-edit.html",
		controller: "networkConnectionTypeNoneEdit",
		replace: true
	 };
})
.controller("networkConnectionTypeNoneEdit", function($scope, $ethernet, $modal, $tr, gettext){
	// expose tab title
	gettext("network.interface.type.none.tab.title");

	$ethernet.getAdapters().done(function(devs){
		$scope.baseDevices = devs.filter(function(dev){
			return !dev.flags || !dev.flags.split(",").find(function(f){ return f == "NOARP"; });
		}).map(function(dev){
			return { label: dev.name + " (" + dev.device + ")", value: dev.device };
		});
		var wan = $scope.baseDevices.find(function(dev){ return dev.value.match(/^eth[\d]+\.[\d]+$/); });
		if(wan){
			$scope.baseDevices = $scope.baseDevices.filter(function(dev){return wan.value.split(".")[0] != dev.value; });
		}
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
.directive("networkDeviceBaseifEdit", function($compile){
	return {
		scope: {
			device: "=ngModel"
		},
		templateUrl: "/widgets/network-device-baseif-edit.html", 
		controller: "networkDeviceBaseifEdit", 
		replace: true
	 };  
})
.controller("networkDeviceBaseifEdit", function($scope){
	
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
.directive("networkDeviceEdit", function($compile){
	return {
		scope: {
			ngModel: "=ngModel"
		}, 
		link: function(scope, element, attrs){
			if(scope.ngModel && scope.ngModel.type){
				element.html($compile("<network-device-"+scope.ngModel.type+"-edit ng-model='ngModel'></network-device-"+scope.ngModel.type+"-edit>")(scope));
			} else {
				element.html("<p>Device of unknown type!</p>");
			}
		} 
	};
})


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
.directive("networkDeviceEthernetEdit", function($compile){
	return {
		templateUrl: "/widgets/network-device-ethernet-edit.html", 
		controller: "networkDeviceEthernetEdit", 
		replace: true
	 };  
})
.controller("networkDeviceEthernetEdit", function($scope){
	
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
.factory("networkHostPicker", function($modal, $network){
	return {
		show: function(opts){
			var def = $.Deferred(); 
			var exclude = {}; // allready added nets that will be excluded from the list
			if(!opts) opts = {}; 
			$network.getConnectedClients().done(function(clients){
				var modalInstance = $modal.open({
					animation: true,
					templateUrl: 'widgets/network-host-picker.html',
					controller: 'networkHostPickerModal',
					resolve: {
						hosts: function () {
							return clients.filter(function(cl){
								// network option is no longer present so we can no longer do this
								// if(opts.net && opts.net != "" && opts.net != "*" && opts.net != cl.network) return false; 
								return true; 
							}).map(function(cl){
								return { label: cl.ipaddr, value: cl }; 
							}); 
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
			}); 
			return def.promise(); 
		}
	}; 
})
.controller("networkHostPickerModal", function($scope, $modalInstance, $wireless, hosts, gettext){
	$scope.hosts = hosts; 
	$scope.data = {}; 
  $scope.ok = function () {
		if(!$scope.data.selected) {
			alert(gettext("You need to select a host!")); 
			return; 
		}
		$modalInstance.close($scope.data.selected);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
})

//! Author: Reidar Cederqivst <reidar.cederqvist@gmail.com>

JUCI.app
.directive("networkWanDnsSettingsEdit", function(){
	return {
		templateUrl: "/widgets/network-wan-dns-settings-edit.html",
		scope: {
			wan_ifs: "=ngModel"
		},
		replace: true,
		require: "^ngModel"
	};
})
.filter("uppercase", function(){
	return function(input){
		input = input || '';
		return String(input).toUpperCase();
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
.directive("overviewWidget10Network", function(){
	return {
		templateUrl: "widgets/overview-net.html",
		controller: "overviewWidgetNetwork",
		replace: true
	 };
})
.directive("overviewStatusWidget10Network", function(){
	return {
		templateUrl: "widgets/overview-net-small.html",
		controller: "overviewStatusWidgetNetwork",
		replace: true
	};
})
.controller("overviewStatusWidgetNetwork", function($scope, $rpc, $firewall){
	$scope.statusClass = "text-success";
	JUCI.interval.repeat("overview-network", 1000, function(done){
		async.series([function(next){
			// TODO: move this to factory
			$firewall.getZoneClients("lan").done(function(clients){
				$scope.numClients = clients.filter(function(x){return x.online}).length;
				$scope.done = 1;
			});
		}], function(){
			done();
		});
	});
})
.controller("overviewWidgetNetwork", function($scope, $firewall, $tr, gettext, $juciDialog, $uci){
	$scope.defaultHostName = $tr(gettext("Unknown"));
	$scope.model = {};
	var pauseSync = false;

	JUCI.interval.repeat("overview-netowrk-widget", 2000, function(done){
		if(pauseSync) {
			done();
			return;
		}
		$firewall.getZoneClients("lan").done(function(clients){
			$scope.clients = [];
			clients.map(function(client){
				client._display_html = "<"+client._display_widget + " ng-model='client'/>";
				$scope.clients.push(client);
			});
			$firewall.getZoneNetworks("lan").done(function(networks){
				if(networks.length < 1) return;
				$scope.model.lan = networks[0];
				$scope.ipaddr = networks[0].ipaddr.value || networks[0].ip6addr.value;
				done();
			});
		});
	});


	$scope.$watch("model.lan", function onOverviewNetworkLanChanged(){
		if(!$scope.model.lan) return;
		$uci.$sync("dhcp").done(function(){
			$scope.model.dhcp = $uci.dhcp["@dhcp"].find(function(x){
				return x.interface.value == $scope.model.lan[".name"] || x[".name"] == $scope.model.lan[".name"];
			});
			$scope.model.dhcpEnabled = $scope.model.dhcp && !$scope.model.dhcp.ignore.value || false;
		});
	}, false);

	$scope.$watch("model.dhcpEnabled", function onOverviewDHCPEnabledChanged(){
		if(!$scope.model.dhcp){
			if($scope.model.lan && $scope.model.dhcpEnabled != undefined){
				$uci.dhcp.$create({
					".type":"dhcp",
					".name": $scope.model.lan[".name"],
					"interface": $scope.model.lan[".name"],
					"ignore": $scope.model.dhcpEnabled
				}).done(function(dhcp){
					$scope.model.dhcp = dhcp;
					$scope.$apply();
				});
			}
		}else {
			$scope.model.dhcp.ignore.value = !$scope.model.dhcpEnabled;
		}
	});

	$scope.onEditLan = function(){
		if(!$scope.model.lan || $scope.model.dhcpEnabled == undefined) return;
		pauseSync = true;
		$juciDialog.show("simple-lan-settings-edit", {
			title: $tr(gettext("Edit LAN Settings")),
			buttons: [
				{ label: $tr(gettext("Save")), value: "save", primary: true },
				{ label: $tr(gettext("Cancel")), value: "cancel" }
			],
			on_button: function(btn, inst){
				pauseSync = false;
				if(btn.value == "cancel") {
					$scope.model.lan.$reset();
					$scope.model.dhcp.$reset();
					inst.dismiss("cancel"); 
				}
				if(btn.value == "save") { 
					inst.close();
				}
			},
			model: $scope.model
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
.directive("overviewSliderWidget10Network", function(){
	return {
		templateUrl: "widgets/overview-slider-network.html", 
		controller: "overviewSliderWidget10Network", 
		replace: true
	 };  
})
.controller("overviewSliderWidget10Network", function($scope, $uci, $rpc, $network, $config, $firewall, $juciDialog, $tr, gettext){
	if(!$rpc.system || !$rpc.network) return; 
	function drawCyGraph(){
		var nodes = []; 
		var edges = []; 
		
		nodes.push({
			data: {
				id: "root", 
				name: $config.board.system, 
				group: "networks",
				weight: 100, 
				mainColor: '#F5A45D', 
				shape: 'rectangle'
			}
		});
		nodes.push({
			data: {
				id: "world", 
				name: "Public", 
				parent: "root", 
				weight: 100, 
				mainColor: "#0000ff", 
				shape: "rectangle"
			}
		}); 
		nodes.push({
			data: {
				id: "user", 
				name: "Local", 
				parent: "root", 
				weight: 100, 
				mainColor: "#00ff00", 
				shape: "rectangle"
			}
		}); 
		var freedevs = {}; 
		$scope.devices.map(function(x){ freedevs[x.name] = x; }); 
		
		$scope.networks.map(function(i){
			var net_id = i[".name"]; 
			// add a wan connection if the interface is connected to wan
			var parent = "root"; 
			var icon = "default.png"; 
			var item = {
				id: net_id, 
				name: net_id,
				network: i, 
				weight: 70, 
				mainColor: '#F5A45D', 
				shape: 'rectangle'
			}; 
			var wan4_interface = "wan", wan6_interface = "wan6", iptv_interface = "wan", voice_interface = "wan"; 
			var settings = $config.settings.network; 

			if(settings) {
				wan4_interface = settings.wan4_interface.value;
				wan6_interface = settings.wan6_interface.value;
				iptv_interface = settings.iptv_interface.value;
				voice_interface = settings.voice_interface.value;
			}

			if(net_id == wan_interface || net_id == voice_interface || net_id == iptv_interface || net_id == ipv6_interface){
				item.parent = "world"; 
			} else if(net_id == "lan"){
				item.parent = "user"; 
			} else if(net_id == "guest"){
				item.parent = "user"; 
			} else if(net_id == "loopback") { 
				item.parent = "user"; 
				item.shape = "octagon"; 
				item.color = "#0000aa"; 
			}
			
			nodes.push({
				data: item
			}); 
			
			if(i.devices && i.devices instanceof Array){
				
				i.devices.map(function(dev){
					// remove from list of free devices
					delete freedevs[dev.name]; 
					
					var dev_id = nodes.length; 
					var item = {
						id: dev.name, 
						name: dev.name, 
						parent: net_id,
						weight: 70, 
						mainColor: '#F5A45D', 
						shape: 'rectangle'
					};
					if(dev.name.match(/.*eth.*/)) item.icon = "lan_port.png"; 
					
					nodes.push({
						data: item
					}); 
				}); 
				
			}
		});
		// now add all free devices as just floating items
		Object.keys(freedevs).map(function(k){
			nodes.push({
				data: {
					id: k, 
					name: k, 
					parent: "root", 
					weight: 70, 
					mainColor: '#aaaaaa', 
					shape: 'rectangle'
				}
			}); 
		}); 
		nodes = nodes.map(function(n){
			//if(!n.data.icon) n.data.icon = "none";
			if(n.data.icon) n.data.icon = "/img/"+n.data.icon;  
			return n; 
		}); 
		
		$('#cy').cytoscape({
			layout: {
				name: 'grid',
				padding: 10
			},
			zoomingEnabled: false, 
			style: cytoscape.stylesheet()
				.selector('node')
					.css({
						'shape': 'data(shape)',
						'width': 'mapData(weight, 40, 80, 20, 60)',
						'content': 'data(name)',
						'text-valign': 'top',
						'text-outline-width': 1,
						'text-outline-color': 'data(mainColor)',
						'background-color': 'data(mainColor)', 
						'color': '#fff'
					})
				.selector('[icon]')
					.css({
						'background-image': 'data(icon)',
						'background-fit': 'cover'
					})
				.selector(':selected')
					.css({
						'border-width': 3,
						'border-color': '#333'
					})
				.selector('edge')
					.css({
						'opacity': 0.666,
						'width': 'mapData(strength, 70, 100, 2, 6)',
						'target-arrow-shape': 'triangle',
						'source-arrow-shape': 'circle',
						'line-color': 'data(color)',
						'source-arrow-color': 'data(color)',
						'target-arrow-color': 'data(color)'
					})
				.selector('edge.questionable')
					.css({
						'line-style': 'dotted',
						'target-arrow-shape': 'diamond'
					})
				.selector('.faded')
					.css({
						'opacity': 0.25,
						'text-opacity': 0
					}),
			
			elements: {
				nodes: nodes,
				edges: edges
			},
			
			ready: function(){
				window.cy = this;
				cy.on('tap', 'node', { foo: 'bar' }, function(evt){
					var node = evt.cyTarget;
					var network = node.data().network; 
					if(network){
						console.log("Selected network "+node.id()); 
						$scope.selected_network = network; 
						$scope.$apply(); 
					} else {
						console.log("Looking for device "+node.id()); 
						/*$ethernet.getDevice({ name: node.id() }).done(function(device){
							$scope.selected_device = device; 
							$scope.$apply(); 
						}); */
					}
					console.log( 'tapped ' + node.id() );
				});
				cy.on('tapstart', 'node', {}, function(ev){
					var node = ev.cyTarget; 
					console.log("Tapstart: "+node.id()); 
				}); 
				cy.on('tapend', 'node', {}, function(ev){
					var node = ev.cyTarget; 
					console.log("Tapend: "+node.id()); 
					
				}); 
			}
		});
	}
	
	var nodes = []; 
	var edges = []; 
	
	function drawVisGraph(){
		/*
		 * Example for FontAwesome
		 */
		var optionsFA = {
			groups: {
				networks: {
					shape: 'icon',
					icon: {
						face: 'FontAwesome',
						code: '\uf0c0',
						size: 50,
						color: '#57169a'
					}
				},
				users: {
					shape: 'icon',
					icon: {
						face: 'FontAwesome',
						code: '\uf007',
						size: 50,
						color: '#aa00ff'
					}
				}
			}
		};

		// create an array with nodes
		var nodesFA = [{
			id: "lan",
			label: 'User 1',
			group: 'users', 
			x: -400, 
			y: 0, 
			physics: false, 
			fixed: { x: true, y: true }
		}, {
			id: 2,
			label: 'User 2',
			group: 'users',
			x: 0, 
			y: 0, 
			physics: false, 
			fixed: { x: true, y: true }
		}, {
			id: 3,
			label: 'Usergroup 1',
			group: 'usergroups'
		}, {
			id: 4,
			label: 'Usergroup 2',
			group: 'usergroups'
		}, {
			id: 5,
			label: 'Organisation 1',
			shape: 'icon',
			icon: {
				face: 'FontAwesome',
				code: '\uf1ad',
				size: 50,
				color: '#f0a30a'
			}
		}];

		// create an array with edges
		var edges = [{
			from: 1,
			to: 3
		}, {
			from: 1,
			to: 4
		}, {
			from: 2,
			to: 4
		}, {
			from: 3,
			to: 5
		}, {
			from: 4,
			to: 5
		}];

		// create a network
		var containerFA = document.getElementById('mynetworkFA');
		var dataFA = {
			nodes: nodesFA,
			edges: edges
		};

		var networkFA = new vis.Network(containerFA, dataFA, optionsFA);
	}
	
	var optionsFA = {
		nodes: {
			color: "#999999", 
			font: {size:15, color:'white' }, 
			borderWidth: 3
		},
		groups: {
			users: {
				shape: 'icon',
				icon: {
					face: 'FontAwesome',
					code: '\uf0c0',
					size: 30,
					color: '#57169a'
				}
			},
			networks: {
				shape: 'icon',
				icon: {
					face: 'Ionicons',
					code: '\uf341',
					size: 30,
					color: '#009900'
				}
			},
			networks_down: {
				shape: 'icon',
				icon: {
					face: 'Ionicons',
					code: '\uf341',
					size: 30,
					color: '#990000'
				}
			},
			static: {
				shape: 'icon',
				icon: {
					face: 'FontAwesome',
					code: '\uf1ad',
					size: 30,
					color: '#f0a30a'
				}
			},
			wan: {
				shape: 'icon',
				icon: {
					face: 'Ionicons',
					code: '\uf38c',
					size: 30,
					color: '#f0a30a'
				}
			}
		}
	};
	
	nodes.push({
		id: ".root",
		label: $config.board.system,
		image: "/img/net-router-icon.png", 
		shape: "image", 
		x: 0, y: 0, 
		size: 60, 
		physics: false, 
		fixed: { x: true, y: true }
	}); 
	
	nodes.push({
		id: ".lan_hub",
		x: -90, y: 0, 
		physics: false, 
		fixed: { x: true, y: true }
	});
	edges.push({ from: ".root", to: ".lan_hub", width: 8, smooth: { enabled: false } }); 
	
	nodes.push({
		id: ".wan_hub",
		x: 90, y: 0, 
		physics: false, 
		fixed: { x: true, y: true }
	});
	edges.push({ from: ".root", to: ".wan_hub", width: 8, smooth: { enabled: false } }); 
	
	$network.getNameServers().done(function(nameservers){
		$network.getConnectedClients().done(function(clients){
			$rpc.network.interface.dump().done(function(stats){
				var interfaces = stats.interface; 
				if(!interfaces) return; 
				var gw_if = interfaces.find(function(x){ return x.route && x.route[0] && x.route[0].target == "0.0.0.0"; }); 
				$firewall.getZones().done(function(zones){
					var wan = zones.find(function(x){ return x.name.value == "wan"; }); 
					var lan = zones.find(function(x){ return x.name.value == "lan"; }); 
					var guest = zones.find(function(x){ return x.name.value == "guest"; }); 
					
					[wan, lan, guest].map(function(zone){
						if(!zone) return; 
						var count = 0; 
						var node = {
							id: "zone."+zone.name.value, 
							label: String(zone.displayname.value || zone.name.value).toUpperCase(), 
							image: "/img/net-interface-icon.png", 
							shape: "image",
							physics: false, 
							fixed: { x: false, y: false }
						}
						if(zone == wan) { node.x = 180; node.y = 0; node.image = "/img/net-interface-wan-icon.png"}
						else if(zone == lan) { node.x = -180; node.y = -50; }
						else if(zone == guest) { node.x = -180; node.y = 50; }
						nodes.push(node);
						
						if(zone != wan)
							edges.push({ from: ".lan_hub", to: node.id, width: 6, smooth: { enabled: false } }); 
						else 
							edges.push({ from: ".wan_hub", to: node.id, width: 6, smooth: { enabled: false } }); 
							
						// add devices from the zone
						zone.network.value.map(function(iface_name){
							var iface = interfaces.find(function(x){ return x.interface == iface_name; }); 
							if(!iface) return; 
							clients.filter(function(x){ return x.device == iface.l3_device; }).map(function(cl){
								// add client to the node list
								var cl_node = {
									id: iface_name+"."+(cl.ipaddr || cl.ip6addr), 
									label: (cl.ipaddr || cl.ip6addr) || cl.hostname, 
									image: "/img/net-laptop-icon.png", 
									shape: "image",
									x: node.x * (2 + Math.floor(count / 10)), 
									fixed: { x: true, y: false },
								}; 
								if(zone == lan) cl_node._lan_client = cl; 
								count ++; 
								var flags = []; 
								if(gw_if && gw_if.route[0].nexthop == cl.ipaddr) flags.push("Default GW"); 
								if(nameservers.find(function(x){ return x == cl.ipaddr; })) flags.push("DNS"); 
								if(flags.length) cl_node.label = "("+flags.join("/")+") "+cl_node.label; 
								if(cl.hostname) cl_node.label = cl_node.label + " (" + cl.hostname + ")"; 
								nodes.push(cl_node); 
								edges.push({ from: node.id, to: cl_node.id, width: 2 });  
							}); 
						}); 
						
					}); 
					
					// create a network
					var containerFA = document.getElementById('mynetworkFA');
					var dataFA = {
						nodes: nodes,
						edges: edges
					};

					var network = new vis.Network(containerFA, dataFA, optionsFA);
					// if we click on a node, we want to open it up!
					network.on("click", function (params) {
						if (params.nodes.length == 1) {
							var node = nodes.find(function(x){ return x.id == params.nodes[0]; }); 
							if(!node || !node._lan_client) return; 
							// this is probably ugliest part of juci right now. 
							// juci dialog creates network-client-edit, we supply our own controller inside which we set the model of that network-client-edit
							// the network-client-edit then responds to a user click and calls close on the modal instance that is part of the model passed to it. 
							// in other words: this sucks. Needs a major rewrite!
							$juciDialog.show("network-client-edit", {
								controller: function($scope, $modalInstance, $wireless, dialogOptions, gettext){
									$scope.opts = dialogOptions; 
									$scope.data = {};
									$scope.on_button_click = function(btn){ 
										if(btn && btn.value == "cancel") $modalInstance.dismiss("cancel"); 
									}, 
									$scope.model = {
										client: dialogOptions.model,
										modal: $modalInstance
									}; 
								}, 
								model: node._lan_client,
								buttons: [ { label: $tr(gettext("Cancel")), value: "cancel" } ] 
							}).done(function(){

							}); 
						}
					});

					/*(function clusterNodes(){
						var clusterIndex = 0; 
						var clusters = []; 
						var scale = 1; 
						var clusterOptionsByData = {
							joinCondition:function(nodeOptions) {
								return nodeOptions.id != ".root";
							},
							processProperties: function(clusterOptions, childNodes) {
								clusterOptions.label = "[" + childNodes.length + "]";
								return clusterOptions;
							},
							clusterNodeProperties: {borderWidth:3, shape:'box', font:{size:30}}
						}
						network.clusterByHubsize(10, clusterOptionsByData);
						// if we click on a node, we want to open it up!
						network.on("selectNode", function (params) {
							if (params.nodes.length == 1) {
								if (network.isCluster(params.nodes[0]) == true) {
									network.openCluster(params.nodes[0])
								}
							}
						});
					})();*/ 
					$scope.$apply(); 
				}); 
			}); 
		}); 
	}); 
})

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
.directive("overviewWidget11WAN", function(){
	return {
		templateUrl: "widgets/overview-wan.html", 
		controller: "overviewWidgetWAN", 
		replace: true
	 };  
})
.directive("overviewStatusWidget11WAN", function(){
	return {
		templateUrl: "widgets/overview-wan-small.html", 
		controller: "overviewWidgetWAN", 
		replace: true
	 };  
})
.filter('formatTimer', function() {
    return function(seconds) {
		var numdays = Math.floor(seconds / 86400);
		var numhours = Math.floor((seconds % 86400) / 3600);
		var numminutes = Math.floor(((seconds % 86400) % 3600) / 60);
		var numseconds = ((seconds % 86400) % 3600) % 60;
		var sec = (numseconds < 10)? '0' + numseconds : '' + numseconds;
		if (numdays > 0) { return (numdays + 'd ' + numhours + 'h ' + numminutes + 'm ' + sec + 's');}
		if (numhours > 0) { return (numhours + 'h ' + numminutes + 'm ' + sec + 's');}
		if (numminutes > 0) { return (numminutes + 'm ' + sec + 's');}
		return (sec+ 's');
    };
})
.controller("overviewWidgetWAN", function($scope, $uci, $rpc, $firewall, $juciDialog, $tr, gettext){
	$scope.showDnsSettings = function(){
		if(!$scope.wan_ifs) return;
		$firewall.getZoneNetworks("wan").done(function(nets){
			var model = {
				aquired: $scope.wan_ifs,
				settings: nets
			};
			$juciDialog.show("network-wan-dns-settings-edit", {
				title: $tr(gettext("Edit DNS servers")),
				buttons: [
					{ label: $tr(gettext("Save")), value: "save", primary: true },
					{ label: $tr(gettext("Cancel")), value: "cancel" }
				],
				on_button: function(btn, inst){
					if(btn.value == "cancel"){
						nets.map(function(x){
							if(x.$reset) x.$reset();
						});
						inst.dismiss("cancel");
					}
					if(btn.value == "save"){
						inst.close();
					}
				},
				size: "md",
				model: model
			});
		});
	};
	$scope.statusClass = "text-success"; 
	JUCI.interval.repeat("overview-wan", 2000, function(done){
		$rpc.network.interface.dump().done(function(result){
			var interfaces = result.interface; 
			$firewall.getZoneNetworks("wan").done(function(wan_ifs){
				var default_route_ifs = wan_ifs.filter(function(x){ 
					return x.$info && x.$info.route && x.$info.route.length && 
						(x.$info.route.find(function(r){ return r.target == "0.0.0.0" || r.target == "::"; }));
				}).map(function(x){ return x.$info}); 
				var con_types = {}; 
				var all_gateways = {}; 
				default_route_ifs.map(function(i){
					var con_type = "ETH"; 
					if(i.l3_device.match(/atm/)) con_type = "ADSL"; 
					else if(i.l3_device.match(/ptm/)) con_type = "VDSL"; 
					else if(i.l3_device.match(/wwan/)) con_type = "3G/4G"; 
					con_types[con_type] = con_type; 
					i.route.map(function(r){
						if(r.nexthop != "0.0.0.0" && r.nexthop != "::") // ignore dummy routes. Note that current gateways should actually be determined by pinging them, but showing all of them is sufficient for now. 
							all_gateways[r.nexthop] = true; 
					}); 
				}); 
				$scope.connection_types = Object.keys(con_types); 
				$scope.all_gateways = Object.keys(all_gateways); 
				$scope.default_route_ifs = default_route_ifs; 
				$scope.wan_ifs = wan_ifs; 
				$scope.$apply(); 
				done(); 
			}); 
		}); 
	}); 
});

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Dongle has been disconnected!":"","A new ethernet device has been connected to your router. Do you want to add it to a network?":"","IP Address must be a valid ipv4 address!":"","IPv6 Aaddress must be a valid ipv6 address":"","Value must be a valid MAC-48 address":"","value must be a valid MAC-48 address":"","Please select a connection in the list!":"","Are you sure you want to delete this connection?":"","You need to select a device to add!":"","You need to specify both name and type!":"","Standard":"","AnyWAN":"","Bridge":"","Static Address":"Static Routes","DHCP v4":"","DHCP v6":"","PPP":"","PPP over Ethernet":"","PPP over ATM":"","3G (ppp over GPRS/EvDO/CDMA or UTMS)":"","QMI (USB modem)":"","NCM (USB modem)":"","HNET (self-managing home network)":"","Point-to-Point Tunnel":"","IPv6 tunnel in IPv4":"","Automatic IPv6 Connectivity Client":"","IPv6 rapid deployment":"","Dual-Stack Lite":"","PPP over L2TP":"","Relayd Pseudo Bridge":"","GRE Tunnel over IPv4":"","Ethernet GRE over IPv4":"","GRE Tunnel over IPv6":"","Ethernet GRE over IPv6":"Internet IPv6","You need to select a network!":"","Try":"","Force":"","None":"","Auto":"","Disabled":"","network.interface.type.anywan.tab.title":"AnyWAN","network.interface.type.bridge.tab.title":"Bridge","Are you sure you want to remove device '+dev+' from network '+net['.name']+' and use it in this bridge?":"","Please select a device in the list!":"","Are you sure you want to delete this device from bridge?":"","network.interface.type.none.tab.title":"Standard","You need to select a host!":"","Unknown":"","Network":"Network","Cancel":"","Network device":"New device","Pick network device":"Pick base device","Name":"Rule Name","Displayname":"","VLAN Tag":"","Device":"Device","Ports":"USB Port","Do you want to:":"","Interface Name":"Interfaces","Interface Type":"Interfaces","Create New Network Interface":"","Automatic DNS Configuration":"Reset Configuration","Primary DNS":"","Primary DNS IP":"","Secondary DNS":"","General":"","Bring-Up on Boot":"","Automatic Default Route":"Default Route","network.interface.type.' + (conn.type.value || 'none') +'.tab.title":"AnyWAN","Advanced":"","Override MAC Address":"","MAC Address":"","Override MTU":"Overview","MTU":"","Custom Delegated IPv6 Prefix":"","IPv6 Prefix":"","Configuration Method":"Reset Configuration","Choose Configuration Option":"Reset Configuration","Method":"","Status":"Status","Pick Network":"Network","APN":"","PIN-code":"","Dial Number":"Interfaces","Username":"","Password":"","Enable DHCP Broadcast Flag (required for some ISPs)":"","Request IPv6 address":"","Request Prefix Length":"","Override Link Local ID":"","IPv6 Address":"","Client ID to send when requesting DHCP":"","Client ID":"","Mode":"","IPv6 Assign":"","Prefix Size":"","IPv4 Assign":"","DNS Name":"","Select Modem Device":"","VCI":"","PPPoA VCI":"","VPI":"","PPPoA VPI":"","Server IP":"Service","IP Address":"","IPv4 Address":"","IPv4 Subnet Mask":"","IPv4 Default Gateway":"Default Route","Static IPv6 Address":"","IPv6 Address Mask":"","Configure As Default Route":"Default Route","IPv6 Default Gateway":"Default Route","Default IPv6 Gateway":"Default Route","IPv6 Assigned Prefix Length":"","Assign prefix to downstream hosts":"","IPv6 Assigned Prefix Hint":"","Prefix hint":"","IPv4 Settings":"NTP Settings","IPv6 Settings":"NTP Settings","Select Base Device":"Pick base device","Device ID":"Device","Base Device":"Dst. Device","ID":"","Select Connected Host":"","Pick a host":"Pick Preset","LAN":"","WAN":"","ONLINE":"","OFFLINE":"","Connections":"","settings.network.info":"This page allows to configure IP addresses used in your home network. In case DHCP is used, your router automatically assignes an IP address to devices connected to the network. Using static DHCP it is possible to always assign the same IP address to specific devices.","Default Route":"Default Route","settings.network.default.route.info":"This page allows to configure IP addresses used in your home network. In case DHCP is used, your router automatically assignes an IP address to devices connected to the network. Using static DHCP it is possible to always assign the same IP address to specific devices."," connection will be used as default outgoing route for packets.":"","Static Routes":"Static Routes","internet.lan.routes.info":"Static routes are useful if you have several networks accessible from your router and you want to correctly route packets between them. ","Target IP Address":"","Netmask":"","Default Gateway":"Default Route","Interface":"Interfaces","Target":"","Gateway":"","Services":"Services","internet.services.info":"Here you can configure network services. ","Connected Clients":"","Hostname":"","VLAN Configuration":"Reset Configuration","status.status.info":"This page provides an overview of main parameters of your router. This can help you to optimize your router or identify potential problems.","Line Status":"Status","Active Connections":"","Connections for each Device":"","status.nat.connections.info":"This page shows the active connection for each device.","NAT Connection Table":"","status.nat.info":"This page shows the active connection for each device.","status.network.routes.info":"Static routes configuration","Routing Status":"","ARP Table":"","IP address":"","MAC address":"","IPv4 Routing Table":"","IPv4 address":"","IPv6 Routing Table":"","IPv6 address":"","Next Hop":"","IPv6 Neighbors Table":"","No IPv6 devices connected":"","IPv6 status":"IGPM TV Status","Router":"","status-network-routes-title":"Routing/ARP Tables","internet-services-title":"Services","internet-network-title":"Network","status-network-nat-title":"NAT","netifd-status-clients-title":"Clients","netifd-vlan-config-title":"VLAN / Switch","status-network-title":"Network Status","internet-routes-title":"Static Routes","network-title":"Network","menu-status-network-routes-title":"Routing/ARP Tables","menu-internet-services-title":"Services","menu-internet-network-title":"Connections","menu-status-network-nat-title":"NAT","menu-netifd-status-clients-title":"Clients","menu-netifd-vlan-config-title":"VLAN / Switch","menu-status-network-title":"Network Status","menu-internet-routes-title":"Static Routes","menu-network-title":"Network"});
	gettextCatalog.setStrings('fi', {"Dongle has been disconnected!":"Dongle on poistettu!","A new ethernet device has been connected to your router. Do you want to add it to a network?":"Uusi ethernet-laite on kytketty reitittimeen. Haluatko lisätä sen verkkoon?","IP Address must be a valid ipv4 address!":"IP-osoite on oltava voimassa oleva IPv4-osoite!","IPv6 Aaddress must be a valid ipv6 address":"IPv6-Aaddress on oltava kelvollinen ipv6-osoite","Value must be a valid MAC-48 address":"Arvon on oltava oikea MAC-48 osoite","value must be a valid MAC-48 address":"arvon on oltava kelvollinen MAC-48-osoite","Please select a connection in the list!":"Valitse yhteys luettelosta!","Are you sure you want to delete this connection?":"Haluatko varmasti poistaa tämän yhteyden?","You need to select a device to add!":"Valitse lisättävä laite!","You need to specify both name and type!":"Määritä nimi ja tyyppi!","Standard":"Normaali","AnyWAN":"AnyWAN","Bridge":"Silta","Static Address":"Kiinteä IP-osoite","DHCP v4":"DHCP IPv4","DHCP v6":"DHCPv6","PPP":"PPP","PPP over Ethernet":"PPP over Ethernet","PPP over ATM":"PPP over ATM","3G (ppp over GPRS/EvDO/CDMA or UTMS)":"3G (GPRS/EvDO/CDMA/UMTS)","QMI (USB modem)":"QMI (USB-modeemi)","NCM (USB modem)":"NCM (USB modeemi)","HNET (self-managing home network)":"HNET (itseohjautuva kotiverkko)","Point-to-Point Tunnel":"Point-to-Point Tunnel","IPv6 tunnel in IPv4":"IPv6 tunnel in IPv4","Automatic IPv6 Connectivity Client":"Automaattinen IPv6 Connectivity Client","IPv6 rapid deployment":"IPv6 rapid deployment","Dual-Stack Lite":"Dual-Stack Lite","PPP over L2TP":"PPP over L2TP","Relayd Pseudo Bridge":"Relayd Pseudo Bridge","GRE Tunnel over IPv4":"GRE Tunnel over IPv4","Ethernet GRE over IPv4":"Ethernet GRE over IPv4","GRE Tunnel over IPv6":"GRE Tunnel over IPv6","Ethernet GRE over IPv6":"Ethernet GRE over IPv6","You need to select a network!":"You need to select a network!","Try":"Try","Force":"Force","None":"None","Auto":"Auto","Disabled":"Pois käytöstä","network.interface.type.anywan.tab.title":"Anywan","network.interface.type.bridge.tab.title":"Silta","Are you sure you want to remove device '+dev+' from network '+net['.name']+' and use it in this bridge?":"Haluatko varmasti poistaa laitteen '+dev+' verkosta ja käyttää sitä '+net['.name']+' sillassa?","Please select a device in the list!":"Valitse laite luettelosta!","Are you sure you want to delete this device from bridge?":"Haluatko varmasti poistaa tämän laitteen sillasta?","network.interface.type.none.tab.title":" ","You need to select a host!":"Valitse isäntäkone!","Unknown":"Tuntematon","Network":"Verkko","Cancel":"Peruuta","Network device":"Valitse verkkolaite","Pick network device":"Valitse verkkolaite","Name":"Nimi","Displayname":"Nimi","VLAN Tag":"VLAN Tag","Device":"Laite","Ports":"Portit","Do you want to:":"Haluatko:","Interface Name":"Liitännän Nimi","Interface Type":"Liitännän Tyyppi","Create New Network Interface":"Luo Uusi Verkkoyhteys","Automatic DNS Configuration":"Automaattinen DNS kokoonpano","Primary DNS":"Primary DNS","Primary DNS IP":"Primary DNS IP","Secondary DNS":"Secondary DNS","General":"Yleiset","Bring-Up on Boot":"Bring-Up on Boot","Automatic Default Route":"Automaattinen oletusreitti","network.interface.type.' + (conn.type.value || 'none') +'.tab.title":"network.interface.type.' + (conn.type.value || 'none') +'.tab.title","Advanced":"Lisäasetukset","Override MAC Address":"Override MAC Address","MAC Address":"MAC Osoite","Override MTU":"Override MTU","MTU":"MTU","Custom Delegated IPv6 Prefix":"Custom Delegated IPv6 Prefix","IPv6 Prefix":"IPv6 etuliite","Configuration Method":"Konfigurointitapa","Choose Configuration Option":"Valitse Konfiguraatiovaihtoehto","Method":"Method","Status":"Tila","Pick Network":"Valitse verkko","APN":"APN","PIN-code":"PIN-koodi","Dial Number":"Puhelinnumero","Username":"Käyttäjänimi","Password":"Salasana","Enable DHCP Broadcast Flag (required for some ISPs)":"Enable DHCP Broadcast Flag (required for some ISPs)","Request IPv6 address":"Request IPv6 address","Request Prefix Length":"Request Prefix Length","Override Link Local ID":"Override Link Local ID","IPv6 Address":"IPv6-osoite","Client ID to send when requesting DHCP":"Client ID to send when requesting DHCP","Client ID":"Client ID","Mode":"Tila","IPv6 Assign":"IPv6 Määritys","Prefix Size":"Prefix Size","IPv4 Assign":"IPv4 määritys","DNS Name":"DNS Nimi","Select Modem Device":"Valitse modeemi","VCI":"VCI","PPPoA VCI":"PPPoA VCI","VPI":"VPI","PPPoA VPI":"PPPoA VPI","Server IP":"Palvelimen IP","IP Address":"IP osoite","IPv4 Address":"IPv4-osoite","IPv4 Subnet Mask":"IPv4 Aliverkon peite","IPv4 Default Gateway":"IPv4 Oletusyhdyskäytävä","Static IPv6 Address":"Kiinteä IPv6-osoite","IPv6 Address Mask":"IPv6 maski","Configure As Default Route":"Määritä Oletusreitiksi","IPv6 Default Gateway":"IPv6 Oletusyhdyskäytävä","Default IPv6 Gateway":"IPv6 Oletusyhdyskäytävä","IPv6 Assigned Prefix Length":"IPv6 Assigned Prefix Length","Assign prefix to downstream hosts":"Assign prefix to downstream hosts","IPv6 Assigned Prefix Hint":"IPv6 Assigned Prefix Hint","Prefix hint":"Prefix hint","IPv4 Settings":"IPv4-asetukset","IPv6 Settings":"IPv6-asetukset","Select Base Device":"Valitse liitäntä","Device ID":"Laite ID","Base Device":"Fyysinen liitäntä","ID":"Tunnus/ID","Select Connected Host":"Valitse Yhdistetty Isäntäkone","Pick a host":"Valitse isäntäkone","LAN":"Lähiverkko (LAN)","WAN":"Internet (WAN)","ONLINE":"PÄÄLLÄ","OFFLINE":"POIS PÄÄLTÄ","Connections":"Yhteydet","settings.network.info":"Tällä sivulla määritellään verkkoyhteydet. Mikäli LAN-yhteyden DHCP otetaan käytttöön, reititin jakaa automaattisesti IP-osoitteen paikalliseen verkkoon yhdistetyille laitteille. Staattista DHCP:tä käyttämällä on mahdollista jakaa aina sama IP-osoite halutulle laitteelle.","Default Route":"DHCP Oletusreitti","settings.network.default.route.info":" "," connection will be used as default outgoing route for packets.":"Oletusreitti","Static Routes":"Staattiset reitit","internet.lan.routes.info":" ","Target IP Address":"Kohdeosoite","Netmask":"Aliverkko","Default Gateway":"Oletusreitti","Interface":"Interface","Target":"Kohde","Gateway":"Modeemi","Services":"Palvelut","internet.services.info":"Palvelut-sivulla voidaan konfiguroida erilaisia ohjelmia kuten Verkkojakoja ja MiniDLNA","Connected Clients":"Yhdistetyt laitteet","Hostname":"Isäntäkoneen nimi","VLAN Configuration":"VLAN konfiguraatio","status.status.info":"Tällä sivulla on yleisnäkymä laitteen pääparameterista. Tämä voi auttaa sinua optimoimaan modeemisi tai tunnistamaan ongelmia.","Line Status":"Linjan tila","Active Connections":"Aktiivisia yhteyksiä","Connections for each Device":"Laitteiden yhteydet","status.nat.connections.info":" ","NAT Connection Table":"NAT yhteystaulu","status.nat.info":"NAT","status.network.routes.info":"Reitit","Routing Status":"Reititystila","ARP Table":"ARP taulu","IP address":"IP-osoite","MAC address":"MAC osoite","IPv4 Routing Table":"IPv4-reititystaulukko","IPv4 address":"IPv4 Osoite","IPv6 Routing Table":"IPv6-reititystaulukko","IPv6 address":"IPv6 Osoite","Next Hop":"Next Hop","IPv6 Neighbors Table":"IPv6 Neighbors Table","No IPv6 devices connected":"Ei yhdistettyjä  IPv6-laitteita","IPv6 status":"IPv6 Tila","Router":"Reititin","status-network-routes-title":"Reitit","internet-services-title":"Palvelut","internet-network-title":"Verkko","status-network-nat-title":"NAT","netifd-status-clients-title":"netifd-status-clients-title","netifd-vlan-config-title":"netifd-vlan-config-title","status-network-title":"Verkko","internet-routes-title":"Reitit","network-title":"Verkko","menu-status-network-routes-title":"Reitit","menu-internet-services-title":"Palvelut","menu-internet-network-title":"Verkko","menu-status-network-nat-title":"NAT","menu-netifd-status-clients-title":"Clients","menu-netifd-vlan-config-title":"menu-netifd-vlan-config-title","menu-status-network-title":"Verkko","menu-internet-routes-title":"Reitit","menu-network-title":"Verkko"});
	gettextCatalog.setStrings('sv-SE', {"Dongle has been disconnected!":"Dongle har kopplats från","A new ethernet device has been connected to your router. Do you want to add it to a network?":"En ny enhet har identifierats på nätverket. Vill du konfigurera den nu? ","IP Address must be a valid ipv4 address!":"IP-Adressen måste vara giltig","IPv6 Aaddress must be a valid ipv6 address":"Adressen måste vara en giltig IPv6 adress","Value must be a valid MAC-48 address":"Värdet måste vara ett giltigt MAC adress","value must be a valid MAC-48 address":"värdet måste vara en giltig MAC-adress","Please select a connection in the list!":"Välj en uppkoppling från listan!","Are you sure you want to delete this connection?":"Är du säker på att du vill ta bort denna uppkoppling? ","You need to select a device to add!":"Du måste välja en enhet du vill lägga till!","You need to specify both name and type!":"Du måste ange både namn och typ!","Standard":"Standard","AnyWAN":"AnyWAN","Bridge":"Brygga","Static Address":"Statisk IP-adress","DHCP v4":"DHCPv4","DHCP v6":"DHCPv6","PPP":"PPP","PPP over Ethernet":"PPP över Ethernet","PPP over ATM":"PPP över ATM","3G (ppp over GPRS/EvDO/CDMA or UTMS)":"","QMI (USB modem)":"","NCM (USB modem)":"","HNET (self-managing home network)":"","Point-to-Point Tunnel":"","IPv6 tunnel in IPv4":"","Automatic IPv6 Connectivity Client":"","IPv6 rapid deployment":"","Dual-Stack Lite":"","PPP over L2TP":"","Relayd Pseudo Bridge":"","GRE Tunnel over IPv4":"","Ethernet GRE over IPv4":"","GRE Tunnel over IPv6":"","Ethernet GRE over IPv6":"Ethernet GRE över IPv6","You need to select a network!":"Du måste välja ett nätverk!","Try":"Försök","Force":"Tvinga","None":"Ingen","Auto":"Auto","Disabled":"Inaktiverad","network.interface.type.anywan.tab.title":"AnyWAN","network.interface.type.bridge.tab.title":"Brygga","Are you sure you want to remove device '+dev+' from network '+net['.name']+' and use it in this bridge?":"","Please select a device in the list!":"Vänligen välj en enhet från listan!","Are you sure you want to delete this device from bridge?":"Är du säker på att du vill ta bort denna enhet från bryggan? ","network.interface.type.none.tab.title":"Statisk","You need to select a host!":"Du måste välja en enhet!","Unknown":"Okänd","Network":"Nätverk","Cancel":"Avbryt","Network device":"Nätverksenhet","Pick network device":"Välj nätverksenhet","Name":"Namn","Displayname":"Visad namn","VLAN Tag":"VLAN tagg","Device":"Enhet","Ports":"Portar","Do you want to:":"Vill du:","Interface Name":"Interface-namn","Interface Type":"Uppkopplingstyp","Create New Network Interface":"Skapa en ny nätverksinterface","Automatic DNS Configuration":"Automatisk konfigurering","Primary DNS":"Primär DNS","Primary DNS IP":"Primär DNS adress","Secondary DNS":"Sekundär DNS","General":"Inställningar","Bring-Up on Boot":"Starta upp vid systemstart","Automatic Default Route":"Automatisk Default-rutt","network.interface.type.' + (conn.type.value || 'none') +'.tab.title":"","Advanced":"Avancerat","Override MAC Address":"Anävnd annan MAC adress","MAC Address":"MAC-adress","Override MTU":"Använd annat MTU","MTU":"MTU","Custom Delegated IPv6 Prefix":"Delegerad IPv6 prefix","IPv6 Prefix":"IPv6 Prefix","Configuration Method":"Konfigurationsmetod","Choose Configuration Option":"Välj konfigurationsväg","Method":"Metod","Status":"Status","Pick Network":"Välj nätverk","APN":"APN","PIN-code":"PIN-kod","Dial Number":"Uppringningsnummer","Username":"Användarnamn","Password":"Lösenord","Enable DHCP Broadcast Flag (required for some ISPs)":"Slå på DHCP Broadcast Flagga (krävs för vissa operatörer)","Request IPv6 address":"Fråga efter IPv6 adress","Request Prefix Length":"Prefix Längd","Override Link Local ID":"Åsidosätt Lokal Länk-ID","IPv6 Address":"IPv6-adress","Client ID to send when requesting DHCP":"Klient-ID att skicka vid förfrågan om DHCP","Client ID":"Klient-ID","Mode":"Inställning","IPv6 Assign":"IPv6 tilldelning","Prefix Size":"Prefixlängd","IPv4 Assign":"IPv4 tilldelning","DNS Name":"DNS Namn","Select Modem Device":"Välj modem","VCI":"VCI","PPPoA VCI":"PPPoA VCI","VPI":"VPI","PPPoA VPI":"PPPoA VPI","Server IP":"Server IP","IP Address":"IP adress","IPv4 Address":"IPv4 adress","IPv4 Subnet Mask":"IPv4-nätmask","IPv4 Default Gateway":"IPv4 gateway","Static IPv6 Address":"Statisk IPv6-adress","IPv6 Address Mask":"IPv6-adress mask","Configure As Default Route":"Konfigurera som default-rutt","IPv6 Default Gateway":"IPv6 Gateway","Default IPv6 Gateway":"","IPv6 Assigned Prefix Length":"IPv6 tildelad prefixlängd","Assign prefix to downstream hosts":"Tilldela prefix till lokala enheter","IPv6 Assigned Prefix Hint":"IPv6 prefix hint","Prefix hint":"Prefixhint","IPv4 Settings":"IPv4 inställningar","IPv6 Settings":"IPv6 inställningar","Select Base Device":"Välj bas-enhet","Device ID":"Enhets-ID","Base Device":"Basenhet","ID":"ID","Select Connected Host":"Välj uppkopplad klient","Pick a host":"Välj enhet","LAN":"LAN","WAN":"WAN","ONLINE":"ONLINE","OFFLINE":"OFFLINE","Connections":"Uppkopplingar","settings.network.info":"Grundläggande nätverskinställningar","Default Route":"Default-rutt","settings.network.default.route.info":"Default-väg"," connection will be used as default outgoing route for packets.":"uppkopplingen kommer att användas som huvudrutt för utgående paket","Static Routes":"Statisk rutter","internet.lan.routes.info":"Inställningar för routing på LAN-sidan","Target IP Address":"IP-adress","Netmask":"Nätmask","Default Gateway":"","Interface":"Interface","Target":"Mål","Gateway":"Gateway","Services":"Tjänster","internet.services.info":"Tjänster på lokala nätverket.","Connected Clients":"Uppkopplade klienter","Hostname":"Datornamn","VLAN Configuration":"VLAN inställningar","status.status.info":"Statusinformation om routerns uppkopplingar.","Line Status":"Linjestatus","Active Connections":"Aktiva uppkopplingar","Connections for each Device":"Uppkopplingar för varje enhet","status.nat.connections.info":"Aktiva NAT-uppkopplingar. ","NAT Connection Table":"NAT-uppkopplingstabell","status.nat.info":"NAT information","status.network.routes.info":"Information om rutter","Routing Status":"Status","ARP Table":"ARP tabell","IP address":"IP adress","MAC address":"MAC-adress","IPv4 Routing Table":"IPv4 Routing Tabell","IPv4 address":"IPv4-adress","IPv6 Routing Table":"IPv6 Routing Tabell","IPv6 address":"IPv6-adress","Next Hop":"Nästa hopp","IPv6 Neighbors Table":"IPv6 granntabell","No IPv6 devices connected":"Inga IPv6 enheter är inkopplade","IPv6 status":"IPv6 status","Router":"Router","status-network-routes-title":"Routing","internet-services-title":"Tjänster","internet-network-title":"Nätverk","status-network-nat-title":"NAT","netifd-status-clients-title":"Klienter","netifd-vlan-config-title":"Switch","status-network-title":"Nätverk","internet-routes-title":"Routing","network-title":"Nätverk","menu-status-network-routes-title":"Routing","menu-internet-services-title":"Tjänster","menu-internet-network-title":"Nätverk","menu-status-network-nat-title":"NAT","menu-netifd-status-clients-title":"Klienter","menu-netifd-vlan-config-title":"Switch","menu-status-network-title":"Nätverk","menu-internet-routes-title":"Routing","menu-network-title":"Nätverk"});
}]);

