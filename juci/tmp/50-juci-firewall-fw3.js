
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
.factory("$firewall", function($uci, $network){
	var firewall = 0; 
	function sync(){
		var deferred = $.Deferred(); 
		if(firewall) setTimeout(function(){ deferred.resolve(); }, 0); 
		else {
			$uci.$sync("firewall").done(function(){
				firewall = $uci.firewall; 
				deferred.resolve(); 
			}); 
		}
		return deferred.promise(); 
	}
	return {
		getZones: function(){
			var deferred = $.Deferred(); 
			sync().done(function(){
				deferred.resolve($uci.firewall["@zone"]); 
			}); 
			return deferred.promise(); 
		}, 
		getRules: function(opts){
			var deferred = $.Deferred(); 
			if(!opts) opts = {}; 
			sync().done(function(){
				if(opts.from_zone){
					var rules = $uci.firewall["@rule"].filter(function(rule){
						return rule.src == opts.from_zone; 
					});
					deferred.resolve(rules); 
				} if(opts.to_zone){
					var rules = $uci.firewall["@rule"].filter(function(rule){
						return rule.dest == opts.to_zone; 
					});
					deferred.resolve(rules); 
				} else { 
					deferred.resolve($uci.firewall["@rule"]); 
				}
			}); 
			return deferred.promise(); 
		},

		//! Returns uci network objects that are members of a zone. 
		//! opts argument is passed to the getNetworks method of $network so it can be used to specify additional filtering. 
		getZoneNetworks: function(zone, opts){
			if(!opts) opts = {}; 
			var def = $.Deferred();  
			sync().done(function(){
				$network.getNetworks({ filter: opts.filter }).done(function(nets){
					var selected_zone;
					if(zone == "lan"){
						selected_zone = $uci.firewall["@zone"].filter(function(x){ return x.masq.value == false; });
					}else if(zone == "wan"){
						selected_zone = $uci.firewall["@zone"].filter(function(x){ return x.masq.value == true; });
					}else{
						var selected_zone = [$uci.firewall["@zone"].find(function(x){ return x.name.value == zone; }) ];
					}
					if(!selected_zone) {
						def.reject({error: "Zone does not exist!"}); 
						return; 
					}
					var zone_nets = nets.filter(function(x){
						return selected_zone.find(function(zone){
							return zone.network.value.indexOf(x[".name"]) != -1;
						});
					}); 
					def.resolve(zone_nets); 
				}); 
			}); 
			return def.promise(); 
		}, 
		getZoneClients: function(zone){
			var def = $.Deferred();
			var networks = [];
			var selected_zone = null;
			var clients = [];
			async.series([
				function(next){
					sync().always(function(){
						selected_zone = $uci.firewall["@zone"].find(function(x){ return x.name.value == zone;});
						if(!selected_zone) {
							def.reject({error: gettext("Zone does not exist!")}); 
							return; 
						}
						next();
					});
				},
				function(next){
					$network.getNetworks().done(function(nets){
						networks = nets;
					}).always(function(){ next();});
				},
				function(next){
					$network.getConnectedClients().done(function(con_clients){
						clients = con_clients;
					}).always(function(){next();});
				}
			], function(){
				//filter out networks by the selected zone
				var zone_networks = networks.filter(function(net){
					return selected_zone.network.value.find(function(zone_net){ return zone_net == net[".name"]; }) !== undefined;
				});
				if(zone_networks.length == 0){
					def.reject({ error: "Found no networks in zone" });
					return;
				}
				// TODO: this may already be fixed but sometimes clients is not an array and this causes a crash. If error is never printed then it is probably safe now. 
				if(!clients.filter){
					console.error("Clients is not an array. Please fix your code!"); 
					def.resolve([]); 
					return; 
				}
				var zone_clients = clients.filter(function(client){
					return zone_networks.find(function(net){
						return net.$info && net.$info.device == client.device;
					});
				});
				def.resolve(zone_clients || []);
			});
			return def.promise();
		},
		// we determine what networks are wan/lan/guest based on zones. This is currently hardcoded,
		// but probably should not be in the future. This will break if the user has different zone names!
		getLanZones: function(){ 
			var deferred = $.Deferred(); 
			sync().done(function(){
				deferred.resolve($uci.firewall["@zone"].filter(function(x){ return x.masq.value == false; })); 
			}); 
			return deferred.promise(); 
		},
		
		getGuestZone: function(){ 
			var deferred = $.Deferred(); 
			sync().done(function(){
				deferred.resolve($uci.firewall["@zone"].find(function(x){ return x.name.value == "guest"; })); 
			}); 
			return deferred.promise(); 
		},
		
		getWanZones: function(){ 
			var deferred = $.Deferred(); 
			sync().done(function(){
				deferred.resolve($uci.firewall["@zone"].filter(function(x){ return x.masq.value == true; })); 
			}); 
			return deferred.promise(); 
		}, 
	
		// TODO: this is meaningless stuff that was added earlier. Remove or replace with something that actually works. 
		nat: {
			enable: function(value){
				$uci.$sync("firewall").done(function(){
					$uci.firewall.settings.nat_enabled.value = value; 
					$uci.firewall["@redirect"].map(function(rule){
						rule.enabled.value = value; 
					}); 
				}); 
			}, 
			isEnabled: function(){
				var def = $.Deferred(); 
				$uci.$sync("firewall").done(function(){
					var enabled = $uci.firewall["@redirect"].find(function(rule){
						return rule.enabled.value; 
					}); 
					if(enabled) {
						$uci.firewall.settings.nat_enabled.value = true; // currently a workaround
					}
					def.resolve($uci.firewall.settings.nat_enabled.value); 
				}); 
				return def.promise(); 
			}
		}
	}; 
}); 

JUCI.app.run(function($uci){
	$uci.$sync("firewall").done(function(){
		if(!$uci.firewall.settings) {
			$uci.firewall.$create({
				".type": "settings", 
				".name": "settings"
			}).done(function(settings){
				$uci.$save(); 
			}); 
		}
	}); 
}); 

UCI.$registerConfig("firewall"); 
UCI.firewall.$registerSectionType("defaults", {
	"syn_flood":		{ dvalue: true, type: Boolean }, 
	"input":			{ dvalue: "ACCEPT", type: String }, 
	"output":			{ dvalue: "ACCEPT", type: String }, 
	"forward":			{ dvalue: "REJECT", type: String }
}); 
UCI.firewall.$registerSectionType("zone", {
	"name":				{ dvalue: "", type: String }, 
	"displayname":		{ dvalue: "", type: String }, // added for displaying zones in different languages
	"input":			{ dvalue: "ACCEPT", type: String }, 
	"output":			{ dvalue: "ACCEPT", type: String }, 
	"forward":			{ dvalue: "REJECT", type: String }, 
	"network": 			{ dvalue: [], type: Array }, 
	"masq":				{ dvalue: false, type: Boolean }, 
	"mtu_fix": 			{ dvalue: false, type: Boolean }
}); 

UCI.firewall.$registerSectionType("forwarding", {
	"src":				{ dvalue: "", type: String }, 
	"dest":				{ dvalue: "", type: String }
}); 

UCI.firewall.$registerSectionType("redirect", {
	"name":				{ dvalue: "", type: String }, 
	"enabled":			{ dvalue: true, type: Boolean }, 
	"src":				{ dvalue: "", type: String }, 
	"dest":				{ dvalue: "", type: String }, 
	"target": 			{ dvalue: "", type: String },
	"src_ip":			{ dvalue: "", type: String, validator: UCI.validators.IPAddressValidator  },
	"src_dport":		{ dvalue: "", type: String, validator: UCI.validators.PortValidator },
	"proto":			{ dvalue: "tcp", type: String }, 
	"dest_ip":			{ dvalue: "", type: String, validator: UCI.validators.IPAddressValidator  }, 
	"dest_port":		{ dvalue: "", type: String, validator: UCI.validators.PortValidator },
	"reflection": 		{ dvalue: false, type: Boolean }
}, function(section){
	if(section.name.value == "") return gettext("Rule name can not be empty!"); 
	if(section.src_dport.value == "") return gettext("Source port can not be empty!"); 
	if(section.dest_port.value == "") return gettext("Dest. port can not be empty!"); 
	return null; 
}); 

UCI.firewall.$registerSectionType("include", {
	"path": 			{ dvalue: "", type: String }, 
	"type": 			{ dvalue: "", type: String }, 
	"family": 			{ dvalue: "", type: String }, 
	"reload": 			{ dvalue: true, type: Boolean }
}); 

UCI.firewall.$registerSectionType("dmz", {
	"enabled": 			{ dvalue: false, type: Boolean }, 
	"host": 			{ dvalue: "", type: String }, // TODO: change to ip address
	"ip6addr":			{ dvalue: "", type: String, validator: UCI.validators.IP6AddressValidator }
}); 

UCI.firewall.$registerSectionType("rule", {
	"type": 				{ dvalue: "generic", type: String }, 
	"name":					{ dvalue: "", type: String }, 
	"src":					{ dvalue: "", type: String }, 
	"src_ip":				{ dvalue: "", type: String, validator: UCI.validators.IPCIDRAddressValidator }, // needs to be extended type of ip address/mask
	"src_mac": 			{ dvalue: [], type: Array, validator: UCI.validators.MACListValidator }, 
	"src_port":			{ dvalue: "", type: String, validator: UCI.validators.PortValidator }, // can be a range
	"dest":				{ dvalue: "", type: String }, 
	"dest_ip":			{ dvalue: "", type: String, validator: UCI.validators.IPCIDRAddressValidator }, 
	"dest_mac":			{ dvalue: "", type: String },
	"dest_port":		{ dvalue: "", type: String, validator: UCI.validators.PortValidator }, // can be a range
	"proto":			{ dvalue: "any", type: String }, 
	"target":			{ dvalue: "REJECT", type: String }, 
	"family": 			{ dvalue: "ipv4", type: String }, 
	"icmp_type": 		{ dvalue: [], type: Array },
	"hidden": 			{ dvalue: false, type: Boolean }, 
	"limit":			{ dvalue: "", type: String }, 
	// scheduling
	"parental": 		{ dvalue: false, type: String }, 
	"start_date":		{ dvalue: "", type: String }, 
	"stop_date":		{ dvalue: "", type: String }, 
	"start_time":		{ dvalue: "", type: String, validator:  UCI.validators.TimeValidator }, 
	"stop_time":		{ dvalue: "", type: String, validator:  UCI.validators.TimeValidator }, 
	"weekdays":			{ dvalue: "", type: String }, 
	"monthdays":		{ dvalue: "", type: String }, 
	"utc_time":			{ dvalue: "", type: Boolean }, 
	"enabled":			{ dvalue: true, type: Boolean }, 
});

UCI.firewall.$registerSectionType("settings", {
	"disabled":		{ dvalue: false, type: Boolean },
	"ping_wan":		{ dvalue: false, type: Boolean }, 
	"nat_enabled": 	{ dvalue: true, type: Boolean }
}); 

UCI.firewall.$registerSectionType("urlblock", {
	"enabled": { dvalue: false, type: Boolean }, 
	"url": 					{ dvalue: [], type: Array }, 
	"src_mac": 			{ dvalue: [], type: Array, validator: UCI.validators.MACListValidator }, 
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
.controller("InternetExHostPageCtrl", function($scope, $rpc, $config, $network, $uci, $tr){
	$scope.config = $config; 
	$scope.wan = {}; 
	$scope.connectedHosts = []; 
	$scope.data = {}; 

	$scope.$watch("data.selected", function onExHostSelectedChanged(value){
		if(!value || !$uci.firewall || !$uci.firewall.dmz) return; 
		$uci.firewall.dmz.host.value = value.ipaddr; 
		$uci.firewall.dmz.ip6addr.value = value.ip6addr; 
	}); 
	// Excluded ports is read from a tmp file that is not created by default. This is a patch feature added to dmz firewall script. Please update your script if you want to use it. 
	$rpc.juci.firewall && $rpc.juci.firewall.dmz.excluded_ports().done(function(data){
		if(data.result && data.result.length){
			$scope.nonforwardedPorts = data.result;
			$scope.$apply();
		}
	});
	/* IPv6 dmz rule (from openwrt)
	config rule
        option src       wan
        option proto     tcpudp
        option dest      lan
        option dest_port 1024:65535
        option family    ipv6
        option target    ACCEPT
	*/		
	$scope.onCreateDMZConfig = function(){
		$uci.firewall.$create({".type": "dmz", ".name": "dmz"}).done(function(dmz){
			//$uci.firewall.$mark_for_reload(); 
			refresh(); 	
		}).fail(function(){
			alert($tr(gettext("Failed to create dmz configuration!"))); 
		}); 
	}
	function refresh(){
		async.series([
			function(next){
				$uci.$sync("firewall").done(function(){
		
				}).always(function(){ next(); }); 
			}, 
			function(next){ 
				if($uci.firewall.dmz == undefined) {
					$scope.done = true;  
					$scope.$apply(); 
					return; 
				}
				$scope.available = false; 
				next(); 
				/*if($uci.firewall.dmz == undefined){
					$uci.firewall.$create({".type": "dmz", ".name": "dmz"}).done(function(dmz){
						next(); 
					}).fail(function(){
						throw new Error("Could not create required dmz section in config firewall!"); 
					}); 
				} else {
					next(); 
				}*/
			}, 
			function(next){
				var fw = $uci.firewall; 
				
				$network.getConnectedClients().done(function(clients){
					$scope.connectedHosts = Object.keys(clients).map(function(k){
						if((clients[k].ipaddr == fw.dmz.host.value && fw.dmz.ip6addr.value == "") || clients[k].ip6addr == fw.dmz.ip6addr.value) $scope.data.selected = clients[k]; 
						return { label: (clients[k].hostname)?(clients[k].hostname+" ("+clients[k].ipaddr+")"):clients[k].ipaddr, value: clients[k] }; 
					}); 
					$scope.$apply(); 
				}).always(function(){ next(); }); 
			}, 
			function(next){
				// get all wan interfaces and list their ip addresses
				$network.getDefaultRouteNetworks().done(function(nets){
					var addr = []; 
					nets.map(function(net){
						net.$info["ipv4-address"].map(function(a){
							addr.push(a.address); 
						}); 
						net.$info["ipv6-address"].map(function(a){
							addr.push(a.address); 
						}); 
						$scope.wan.ip = addr.join(","); 
					}); 
				}).always(function(){ next(); }); 
			}
		], function(){
			$scope.firewall = $uci.firewall; 
			$scope.available = "dmz" in $uci.firewall; 
			$scope.done = true; 
			$scope.$apply(); 
		}); 
	} refresh(); 
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
.controller("InternetFirewallForwardingPage", function($scope, $uci, $firewall){
	$scope.data = {}; 
	$firewall.getZones().done(function(zones){
		$uci.$sync("firewall").done(function(){
			var forwards = []; 
			zones.map(function(src){
				zones.map(function(dst){
					if(src.name.value == dst.name.value) return; 
					var fwd = $uci.firewall["@forwarding"].find(function(x){ return x.src.value == src.name.value && x.dest.value == dst.name.value; }); 
					forwards.push({
						title: src.name.value + " - > "+dst.name.value, 
						enabled: fwd != null, 
						src: src.name.value, 
						dst: dst.name.value, 
						base: fwd
					}); 
				}); 
			}); 
			$scope.forwards = forwards; 
			$scope.$apply(); 
		}); 
	}); 
	$scope.onToggleForward = function(fwd){
		console.log("forward: "+fwd); 
		if(!fwd.enabled && !fwd.base){
			$uci.firewall.$create({
				".type": "forwarding", 
				"src": fwd.src, 
				"dest": fwd.dst
			}).done(function(section){
				fwd.base = section; 
				fwd.enabled = true; 
				$scope.$apply(); 
			}); 
		} else if(fwd.base){
			fwd.base.$delete().done(function(){
				fwd.base = null; 
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
.controller("InternetPortMappingPageCtrl", function($scope, $uci, $rpc, $tr, gettext){
	function reload(){
		$uci.$sync("firewall").done(function(){
			$scope.redirects = $uci.firewall["@redirect"];
			$scope.$apply(); 
		}); 
	} reload(); 
	
	$scope.onAddRule = function(){
		$uci.firewall.$create({
			".type": "redirect", 
			"name": "new_rule",
			"src": "wan", 
			"dest": "lan", 
			"target": "DNAT"
		}).done(function(section){
			$scope.rule = section; 
			$scope.rule[".new"] = true; 
			$scope.$apply(); 
		}); 
	};
	
	$scope.onEditRule = function(rule){
		if(!rule) return; 
		rule.$begin_edit(); 
		$scope.rule = rule; 
	};
	
	$scope.onDeleteRule = function(rule){
		rule.$delete().done(function(){
			$scope.$apply(); 
		}); 
	};
	
	$scope.onAcceptEdit = function(){
		$scope.errors = $scope.rule.$getErrors(); 
		if($scope.errors.length) return; 
		var found = $uci.firewall["@redirect"].find(function(x){
			return x != $scope.rule && x.name.value == $scope.rule.name.value; 
		}); 
		if(found) { alert($tr(gettext("A port forwarding rule with the same name already exists! Please specify a different name!"))); return; }
		$scope.rule[".new"] = false; 
		$scope.rule = null;  
	};
	
	$scope.onCancelEdit = function(){
		if(!$scope.rule) return; 
		$scope.rule.$cancel_edit(); 
		if($scope.rule[".new"]){
			$scope.rule.$delete().done(function(){
				$scope.rule = null; 
				$scope.$apply(); 
			}); 
		} else {
			$scope.rule = null; 
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
.controller("InternetFirewallRulesPage", function($scope, $uci, $firewall, $tr, gettext){
	$firewall.getRules().done(function(rules){
		$scope.rules = rules; 
		$scope.$apply(); 
	}); 
	$uci.$sync("firewall").done(function(){
		$scope.firewall = $uci.firewall; 
		$scope.$apply(); 
	});  
	$scope.getItemTitle = function(item){
		return item.name.value || item[".name"]; 
	}
	
	
	$scope.onCreateRule = function(){
		$uci.firewall.$create({
			".type": "rule", 
			"name": "new_rule"
		}).done(function(){
			$scope.$apply(); 
		}); 
	}
	
	$scope.onDeleteRule = function(rule){
		if(!rule) alert($tr(gettext("Please select a rule to delete!")));
		if(confirm($tr(gettext("Are you sure you want to delete this rule?")))){
			rule.$delete().done(function(){
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
.controller("InternetWanServices", function($scope, $rpc, $network, $uci){
	$uci.$sync("firewall").done(function(){
		function findRule(service){
			return $uci.firewall["@rule"].find(function(r){
				return r.src.value == "wan" && r.proto.value == service.proto && r.dest_port.value == parseInt(service.listen_port); 
			});
		}
		$network.getServices().done(function(services){
			$scope.services = services.filter(function(x){ return x.listen_ip == "0.0.0.0" })
			.map(function(svc){
				var rule = findRule(svc); 
				svc.$rule = rule; 
				svc.$allow = (rule && rule.enabled.value)?true:false; 
				return svc; 
			}); 
			$scope.$apply(); 
		}); 
		$scope.getServiceTitle = function(svc){
			return svc.name + " (" + svc.listen_port + ")"; 	
		}
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
.controller("InternetFirewallServiceFilterPage", function($scope, $uci, $firewall){
	
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
.controller("InternetFirewallUrlblockPage", function($scope, $uci, $firewall, $network){
	$scope.urlList = [];
	$scope.macList = []; 
	$scope.errors = []; 
	$scope.connectedHosts = []; 
	
	$network.getConnectedClients().done(function(clients){
		$scope.connectedHosts = clients.map(function(client){
			return { 
				label: (client.hostname||"*")+" ("+client.ipaddr+")", 
				value: client.macaddr 
			}; 
		}); 
		$scope.$apply(); 
	});
	
	async.series([
		function(next){
			$uci.$sync("firewall").done(function(){
				$scope.firewall = $uci.firewall; 
				if(!$uci.firewall.urlblock){
					$uci.firewall.$create({".type": "urlblock", ".name": "urlblock"}).done(function(){
						$uci.$save().always(function(){ next(); }); 
					}); 
				} else {
					next(); 
				}
			}); 
		}, function(){
			$scope.urlblock = $uci.firewall.urlblock; 
			$scope.accessRules = $uci.firewall["@rule"].filter(function(x){
				return x.parental.value; 
			}); 
			$scope.urlblock.url.value.map(function(x){ $scope.urlList.push({url: x}); }); 
			$scope.urlblock.src_mac.value.map(function(x){ $scope.macList.push({mac: x}); }); 
			
			$scope.validateMAC = function(mac) { return (new UCI.validators.MACAddressValidator()).validate({value: mac}); }
			$scope.validateTimeSpan = function(range) { return (new UCI.validators.TimespanValidator()).validate({value: range})}; 
			
			$scope.onAddURL = function(){
				$scope.urlList.push({url: ""}); 
			}
			$scope.onDeleteURL = function(url){
				$scope.urlList = $scope.urlList.filter(function(x){
					return x.url != url; 
				}); 
			}
			
			$scope.$watch("urlList", function onUrlblockUrlListChanged(){
				$scope.urlblock.url.value = $scope.urlList.map(function(k){
					return k.url; 
				}); 
			}, true);
			$scope.$watch("macList", function onUrlblockMaclistChanged(){
				$scope.urlblock.src_mac.value = $scope.macList.map(function(k){
					return k.mac; 
				}); 
			}, true);
			
			function updateRules(){
				$scope.accessRules = $uci.firewall["@rule"].filter(function(rule){
					return rule.parental.value; 
				}); 
			} updateRules(); 
			
			$scope.onAddAccessRule = function(){
				$uci.firewall.$create({".type": "rule", "parental": true}).done(function(rule){
					rule[".new"] = true; 
					$scope.rule = {
						time_start: rule.start_time.value, 
						time_end: rule.stop_time.value, 
						days: rule.weekdays.value.split(" "), 
						macList: rule.src_mac.value.map(function(x){ return { mac: x }; }), 
						uci_rule: rule
					}; 
					$scope.$apply(); 
				}); 
			}
			
			$scope.onEditAccessRule = function(rule){
				$scope.rule = {
					time_start: rule.start_time.value, 
					time_end: rule.stop_time.value, 
					days: rule.weekdays.value.split(" "), 
					macList: rule.src_mac.value.map(function(x){ return { mac: x }; }), 
					uci_rule: rule
				}; 
			}
			
			$scope.onDeleteAccessRule = function(rule){
				rule.$delete().done(function(){
					updateRules(); 
					$scope.$apply(); 
				}); 
			}
			
			$scope.onAcceptEdit = function(){
				if($scope.rule.macList.find(function(k){
					return $scope.validateMAC(k.mac); 
				})) return; 
				
				var rule = $scope.rule.uci_rule; 
				if(rule[".new"]) {
					$scope.accessRules.push(rule); 
					rule[".new"] = false; 
				}
				rule.src_mac.value = $scope.rule.macList.map(function(k){
					return k.mac; 
				}); 
				rule.start_time.value = $scope.rule.time_start; 
				rule.stop_time.value = $scope.rule.time_end; 
				rule.weekdays.value = $scope.rule.days.join(" "); 
				
				$scope.errors = rule.$getErrors().concat($scope.validateTimeSpan($scope.rule.time_start+"-"+$scope.rule.time_end)).filter(function(x){ return x; }); 
				if(!$scope.errors || $scope.errors.length == 0)
					$scope.rule = null; 
			}
			
			$scope.onCancelEdit = function(){
				if($scope.rule && $scope.rule.uci_rule){
					if($scope.rule.uci_rule[".new"])
						$scope.rule.uci_rule.$delete(); 
					else 
						$scope.rule.uci_rule.$reset(); 
				}
				$scope.rule = null; 
			}
			
			$scope.$apply(); 
		}
	]); 
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
.controller("InternetFirewallWordfilterPage", function($scope, $uci, $firewall){
	
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
.controller("InternetFirewallZonesPage", function($scope, $firewall, $uci, $tr, gettext){

	$firewall.getZones().done(function(zones){
		$scope.zones = zones; 
		$scope.$apply(); 
	}); 
	
	$scope.getItemTitle = function(item){
		return item.name.value; 
	}
	
	$scope.onCreateZone = function(){
		$uci.firewall.$create({
			".type": "zone", 
			"name": "new_zone"
		}).done(function(){
			$scope.$apply(); 
		}); 
	}
	
	$scope.onDeleteZone = function(zone){
		if(!zone) alert($tr(gettext("Please select a zone to delete!"))); 
		if(confirm($tr(gettext("Are you sure you want to delete this zone?")))){
			zone.$delete().done(function(){
				// remove any forwarding rules that mention zone have deleted. 
				var rem = [];
				$uci.firewall["@forwarding"].map(function(fw){
					if(fw.src.value == zone.name.value || fw.dest.value == zone.name.value){
						rem.push(fw);
					}
				});
				async.eachSeries(rem, function(x, next){
					x.$delete().always(function(){ next(); }); 
				}, function(){
					$scope.$apply(); 
				}); 
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
.controller("InternetFirewallPageCtrl", function($scope, $uci, $firewall){
	$scope.data = {}; 
	$firewall.getZones().done(function(zones){
		$scope.zones = zones; 
		$scope.$apply(); 
	}); 
	$firewall.getRules().done(function(rules){
		$scope.rules = rules; 
		$scope.$apply(); 
	});

	$firewall.nat.isEnabled().done(function(enabled){
		$scope.data.nat_enabled = enabled; 
		$scope.$apply(); 
	});
	
	$scope.onEnableNAT = function(){
		$firewall.nat.enable($scope.data.nat_enabled); 
	}

	$uci.$sync("firewall").done(function(){
		$scope.firewall = $uci.firewall; 
		$scope.data.enabled = $uci.firewall["@zone"].filter(function(zone){ 
			return zone.name.value == "wan" && zone.input.value == "REJECT" && zone.forward.value == "REJECT"; 
		}).length > 0; 
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
.controller("InternetParentalControlPage", function($scope, $uci, $rpc, $network, $tr, gettext){
	$scope.urlList = [];
	$scope.macList = []; 
	$scope.errors = []; 
	$scope.connectedHosts = []; 
	
	$network.getConnectedClients().done(function(clients){
		$scope.connectedHosts = clients.map(function(client){
			return { 
				label: (client.hostname||"*")+" ("+client.ipaddr+")", 
				value: client.macaddr 
			}; 
		}); 
		$scope.$apply(); 
	});
	
	async.series([
		function(next){
			$uci.$sync("firewall").done(function(){
				$scope.firewall = $uci.firewall; 
				if(!$uci.firewall.urlblock){
					$uci.firewall.$create({".type": "urlblock", ".name": "urlblock"}).done(function(){
						$uci.$save().always(function(){ next(); }); 
					}); 
				} else {
					next(); 
				}
			}).always(function(){next();}); 
		}, function(next){
			// create url blocking section if it does not exist
			if(!$uci.firewall.urlblock){
				$uci.firewall.$create({
					".type": "urlblock", 
					".name": "urlblock"
				}).always(function(){
					next(); 
				}); 
			} else {
				next(); 
			}
		}, function(next){
			$rpc.juci.system.time.timediff().done(function(data){
				$scope.diff = data.diff;
			}).always(function(){next();});
		}], function(){
			$scope.accessRules = $uci.firewall["@rule"].filter(function(x){
				return x.parental.value; 
			}); 
			$scope.urlblock = $uci.firewall.urlblock; 
			$scope.urlblock.url.value.map(function(x){ $scope.urlList.push({url: x}); }); 
			$scope.urlblock.src_mac.value.map(function(x){ $scope.macList.push({mac: x}); }); 

			$scope.validateMAC = function(mac) { return (new UCI.validators.MACAddressValidator()).validate({value: mac}); }
			$scope.validateTimeSpan = function(range) { return (new UCI.validators.TimespanValidator()).validate({value: range})}; 
			
			$scope.onAddURL = function(){
				$scope.urlList.push({url: ""}); 
			}
			$scope.onDeleteURL = function(url){
				$scope.urlList = $scope.urlList.filter(function(x){
					return x.url != url; 
				}); 
			}
			
			$scope.$watch("urlList", function onParentalUrlListChanged(){
				$scope.urlblock.url.value = $scope.urlList.map(function(k){
					return k.url; 
				}); 
			}, true);
			$scope.$watch("macList", function onParentalMACListChanged(){
				$scope.urlblock.src_mac.value = $scope.macList.map(function(k){
					return k.mac; 
				}); 
			}, true);
			
			function updateRules(){
				$scope.accessRules = $uci.firewall["@rule"].filter(function(rule){
					return rule.parental.value; 
				}); 
			} updateRules(); 
			$scope.convertTime = function(orig, diff){
				if(orig.match(/^[0-9]+:.+$/) == null || typeof diff != "number") return;
				var parts = orig.split(":");
				var new_hour = parseInt(parts[0]) + diff;
				if(new_hour < 10) parts[0] = "0"+new_hour;
				else parts[0] = ""+new_hour;
				return parts.join(":");
			};
			$scope.onCreateAccessRule = function(){
				console.log("Adding rule.."); 
				$uci.firewall.$create({
					".type": "rule", 
					"parental": true
				}).done(function(rule){
					rule[".new"] = true; 
					rule.name.value = $tr(gettext("Parental Rule")); 
					$scope.rule = {
						time_start: rule.start_time.value, 
						time_end: rule.stop_time.value, 
						days: rule.weekdays.value.split(" "), 
						macList: rule.src_mac.value.map(function(x){ return { mac: x }; }), 
						uci_rule: rule
					}; 
					$scope.$apply(); 
				}); 
			}
			
			$scope.onEditAccessRule = function(rule){
				$scope.rule = {
					time_start: $scope.convertTime(rule.start_time.value, $scope.diff),
					time_end: $scope.convertTime(rule.stop_time.value, $scope.diff),
					days: rule.weekdays.value.split(" "), 
					macList: rule.src_mac.value.map(function(x){ return { mac: x }; }), 
					uci_rule: rule
				}; 
			}
			
			$scope.onDeleteAccessRule = function(rule){
				rule.$delete().done(function(){
					updateRules(); 
					$scope.$apply(); 
				}); 
			}
			
			$scope.onAcceptEdit = function(){
				if($scope.rule.macList.find(function(k){
					return $scope.validateMAC(k.mac); 
				})) return; 
				
				var rule = $scope.rule.uci_rule; 
				if(rule[".new"]) {
					$scope.accessRules.push(rule); 
					rule[".new"] = false; 
				}
				rule.src_mac.value = $scope.rule.macList.map(function(k){
					return k.mac; 
				}); 
				rule.start_time.value = $scope.convertTime($scope.rule.time_start, -$scope.diff);
				rule.stop_time.value = $scope.convertTime($scope.rule.time_end, -$scope.diff); 
				rule.weekdays.value = $scope.rule.days.join(" "); 
				
				$scope.errors = rule.$getErrors().concat($scope.validateTimeSpan($scope.rule.time_start+"-"+$scope.rule.time_end)).filter(function(x){ return x; }); 
				if(!$scope.errors || $scope.errors.length == 0)
					$scope.rule = null; 
			}
			
			$scope.onCancelEdit = function(){
				if($scope.rule && $scope.rule.uci_rule){
					if($scope.rule.uci_rule[".new"])
						$scope.rule.uci_rule.$delete(); 
					else 
						$scope.rule.uci_rule.$reset(); 
				}
				$scope.rule = null; 
			}
			
			$scope.$apply(); 
		}
	); 
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
.directive("firewallMaclistEdit", function($compile){
	return {
		templateUrl: "/widgets/firewall-maclist-edit.html", 
		scope: {
			macList: "=ngModel"
		}, 
		controller: "firewallMaclistEdit", 
		replace: true
	 };  
})
.controller("firewallMaclistEdit", function($scope, $config, $uci, $rpc, $network, $localStorage, $state, gettext){ 
	$network.getConnectedClients().done(function(clients){
		$scope.connectedHosts = clients.map(function(client){
			return { 
				label: (client.hostname)?(client.hostname +" ("+client.ipaddr+")"):client.ipaddr, 
				value: client.macaddr 
			}; 
		}); 
		$scope.$apply(); 
	});
	
	$scope.validateMAC = function(mac){ 
		return (new UCI.validators.MACAddressValidator()).validate({ value: mac }); 
	}
	$scope.onAddMAC = function(){
		$scope.macList.push({mac: ""}); 
	}
	
	$scope.onDeleteMAC = function(mac){
		$scope.macList.find(function(x, i){
			if(x.mac == mac) {
				$scope.macList.splice(i, 1); 
				return true; 
			} 
			return false; 
		});  
	}
	
	$scope.onSelectExistingMAC = function(value){
		if(!$scope.macList.find(function(x){ return x.mac == value}))
			$scope.macList.push({mac: value}); 
		$scope.selectedMAC = ""; 
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
.directive("firewallRuleEdit", function(){
	return {
		scope: {
			rule: "=ngModel"
		}, 
		controller: "firewallRuleEdit", 
		templateUrl: "/widgets/firewall-rule-edit.html"
	}; 
})
.controller("firewallRuleEdit", function($scope, $firewall, gettext, $tr, $network, networkHostPicker){
	
	$scope.protocolChoices = [
		{ label: "UDP", value: "udp"}, 
		{ label: "TCP", value: "tcp"}, 
		{ label: "ICMP", value: "icmp"}, 
		{ label: "TCP + UDP", value: "tcpudp" },
		{ label: "ESP", value: "esp" }
	]; 
	
	$scope.familyChoices = [
		{ label: "Any", value: "any" },
		{ label: "IPv4", value: "ipv4"}, 
		{ label: "IPv6", value: "ipv6"}
	]; 
	$scope.targetChoices = [
		{ label: gettext("ACCEPT"), value: "ACCEPT" }, 
		{ label: gettext("REJECT"), value: "REJECT" }, 
		{ label: gettext("FORWARD"), value: "FORWARD" },
		{ label: gettext("DROP"), value: "DROP" }
	]; 
	
	$firewall.getZones().done(function(zones){
		$scope.allZones = []; 
		$scope.allZones.push({ label: $tr(gettext("Unspecified")), value: "" }); 
		$scope.allZones.push({ label: $tr(gettext("Any")), value: "*" }); 
		zones.map(function(x){
			$scope.allZones.push({ label: String(x.name.value).toUpperCase(), value: x.name.value }); 
		}); 
	}); 
	
	function update(){
		var rule = $scope.rule; 
		if(!rule || !rule.src_ip) return; 
		$scope.data = {
			src_ip_enabled: rule.src_ip.value != "", 
			src_mac_enabled: rule.src_mac.value != "", 
			src_port_enabled: rule.src_port.value != "", 
			dest_ip_enabled: rule.dest_ip.value != "", 
			dest_mac_enabled: rule.dest_mac.value != "", 
			dest_port_enabled: rule.dest_port.value != ""
		};
		// clear a field if user unclicks the checkbox
		Object.keys($scope.data).map(function(k){
			$scope.$watch("data."+k, function onFirewallRuleEnabledChanged(value){
				var field = k.replace("_enabled", ""); 
				if(!value && $scope.rule) $scope.rule[field].value = ""; 
			}); 
		}); 
		setTimeout(function(){
			$scope.$apply(); 
		}); 
	}
	
	$scope.onSelectSrcHost = function(){
		if(!$scope.rule) return; 
		networkHostPicker.show({ net: $scope.rule.src.value }).done(function(client){
			$scope.rule.src_ip.value = client.ipaddr; 
			$scope.rule.src_mac.value = client.macaddr; 
			update(); 
		}); 
	}
	
	$scope.onSelectDestHost = function(){
		if(!$scope.rule) return; 
		networkHostPicker.show({ net: $scope.rule.dest.value }).done(function(client){
			$scope.rule.dest_ip.value = client.ipaddr; 
			$scope.rule.dest_mac.value = client.macaddr; 
			update(); 
		}); 
	}
	
	$scope.$watch("rule", function onFirewallRuleModelChanged(rule){
		if(!rule) return; 
		update(); 
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
.directive("firewallUrlfilterEditor", function(){
	return {
		controller: "firewallUrlfilterEditor", 
		templateUrl: "/widgets/firewall-urlfilter-editor.html"
	}; 
})
.controller("firewallUrlfilterEditor", function($scope, $firewall){
	
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
.directive("firewallWanServiceEdit", function(){
	return {
		scope: {
			service: "=ngModel"
		}, 
		controller: "firewallWanServiceEdit", 
		templateUrl: "/widgets/firewall-wan-service-edit.html"
	}; 
})
.controller("firewallWanServiceEdit", function($scope, $uci, $firewall){
	$scope.onChangeState = function(){ 
		var service = $scope.service; 
		if(!service.$rule || !service.$rule[".name"]){
			$uci.firewall.$create({
				".type": "rule", 
				"name": "Allow connection to "+service.name+" port "+service.listen_port+" from wan interface", 
				"src": "wan", 
				"proto": service.proto, 
				"dest_port": service.listen_port, 
				"target": "ACCEPT"
			}).done(function(rule){
				service.$rule = rule; 
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
.directive("firewallZoneEdit", function(){
	return {
		scope: {
			zone: "=ngModel"
		}, 
		controller: "firewallZoneEdit", 
		templateUrl: "/widgets/firewall-zone-edit.html"
	}; 
})
.controller("firewallZoneEdit", function($scope, $firewall, gettext, $network, networkConnectionPicker, $uci, $tr, gettext){
	$scope.policys = [
		{ label: gettext("ACCEPT"), value: "ACCEPT" }, 
		{ label: gettext("REJECT"), value: "REJECT" }, 
		{ label: gettext("DROP"), value: "DROP" },
		{ label: gettext("FORWARD"), value: "FORWARD" }
	]; 
	
	$scope.$watch("zone", function onFirewallZoneModelChanged(zone){
		$scope.zones = {source:[], dest:[]}
		if(!zone) return; 
		//zone.name.validator = new zoneValidator();
		// old version
		/*
		$network.getNetworks().done(function(nets){
			if(!zone || !zone.network) return; 
			$scope.networks = zone.network.value.map(function(name){
				var net = nets.find(function(x){ return x[".name"] == name; }); 
				if(!net) return null; 
				return net; 
			}).filter(function(x){ return x != null; }); 
			$scope.$apply(); 
		}); 
		*/
		$firewall.getZones().done(function(zones){
			var others = zones.filter(function(z){ return z.name.value != zone.name.value }).map(function(z){ return { name:z.name.value }; });
			$uci.$sync("firewall").done(function(){
				var forwards = $uci.firewall["@forwarding"];
				others.map(function(other){
					if(forwards.find(function(fw){ return fw.src.value == other.name && fw.dest.value == zone.name.value; }))
						$scope.zones.source.push({name: other.name, selected: true });
					else
						$scope.zones.source.push({name: other.name, selected: false });
					if(forwards.find(function(fw){ return fw.dest.value == other.name && fw.src.value == zone.name.value; }))
						$scope.zones.dest.push({ name: other.name, selected: true });
					else
						$scope.zones.dest.push({ name: other.name, selected: false });
				});
				$scope.changeForwards = function(){
					var rem = forwards.filter(function(fw){ return fw.src.value == zone.name.value || fw.dest.value == zone.name.value; });
					for(var i = rem.length; i > 0; i--){ rem[i-1].$delete();}
					$scope.zones.source.map(function(src){
						if(src.selected){
							$uci.firewall.$create({ ".type":"forwarding", "src": src.name, "dest": zone.name.value });
						}
					});
					$scope.zones.dest.map(function(dst){
						if(dst.selected){
							$uci.firewall.$create({ ".type":"forwarding", "src": zone.name.value, "dest": dst.name });
						}
					});
				};
				$scope.$apply();
			});
		});
	}); 
	
	$scope.getItemTitle = function(net){
		return net;
	}
	
	
	$scope.onAddNetwork = function(){
		if(!$scope.zone) return; 
		networkConnectionPicker.show({ exclude: $scope.zone.network.value }).done(function(network){
			var tmp = [];
			$scope.zone.network.value.map(function(net){ tmp.push(net);});
			tmp.push(network[".name"]);
			$scope.zone.network.value = tmp;
			$scope.$apply(); 
		}); 
	}
	
	$scope.onRemoveNetwork = function(conn){
		if(!$scope.zone) return; 
		if(!conn) alert(gettext("Please select a connection in the list!")); 
		if(confirm(gettext("Are you sure you want to remove this network from this zone?"))){
			$scope.zone.network.value = $scope.zone.network.value.filter(function(name){
				return name != conn; 
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
.directive("uciFirewallNatRuleEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/uci.firewall.nat.rule.edit.html", 
		scope: {
			rule: "=ngModel"
		}, 
		controller: "uciFirewallNatRuleEdit", 
		replace: true
	 };  
}).controller("uciFirewallNatRuleEdit", function($scope, $uci, $rpc, $firewall, $network, $log){
	$scope.portIsRange = 0;
	$scope.data = {}; 
	$scope.$watch("rule", function onFirewallNatRuleModelChanged(value){
		if(!value) return;
		// TODO: why does rule all of a sudden gets value that is not a uci sectioN??
		if(!value[".config"]) { 
			console.error("nat-rule-edit: invalid ngModel! must be config section! "+Object.keys(value)); 
			return; 
		}
		$scope.data.src_ip_enabled = (value.src_ip.value)?true:false; 
		if(value.src_dport.value && value.dest_port.value){	
			$scope.portIsRange = (value.src_dport.value.indexOf("-") != -1) || (value.dest_port.value.indexOf("-") != -1); 
		}
	}); 
	$scope.$watch("data.src_ip_enabled", function onFirewallSRCIPChanged(value){
		if($scope.rule && value == false) $scope.rule.src_ip.value = ""; 
	}); 

	$scope.protocolChoices = [
		{ label: "UDP", value: "udp"}, 
		{ label: "TCP", value: "tcp"}, 
		{ label: "TCP + UDP", value: "tcpudp" }
	]; 
	$scope.deviceChoices = [];
	$firewall.getZones().done(function(zones){
		$scope.allZones = zones.map(function(x){ return { label: x.name.value.toUpperCase(), value: x.name.value } }); 
		$network.getConnectedClients().done(function(clients){
			var choices = []; 
			clients.map(function(c) {
				choices.push({
					label: (c.hostname && c.hostname.length)?c.hostname:c.ipaddr, 
					value: c.ipaddr
				}); 
			}); 
			$scope.deviceChoices = choices; 
			$scope.$apply(); 
		});
	}); 
	$scope.onPortRangeClick = function(value){
		$scope.portIsRange = value;  
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
.directive("uciFirewallRuleEdit", function($compile, $parse){
	return {
		templateUrl: "/widgets/uci.firewall.rule.edit.html", 
		scope: {
			ngModel: "=ngModel"
		}, 
		controller: "uciFirewallRuleEdit", 
		replace: true
	 };  
}).controller("uciFirewallRuleEdit", function($scope, $uci, $rpc, $network, $log, $tr, gettext){
	$scope.$watch("ngModel", function onFirewallRuleModelChanged(value){
		if(!value) return; 
		var ngModel = value; 
		if(ngModel && ngModel.src_dport && ngModel.dest_port && ngModel.src_dport.value && ngModel.dest_port.value){
			$scope.portIsRange = (ngModel.src_dport.value.indexOf("-") != -1) || (ngModel.dest_port.value.indexOf("-") != -1); 
		}
	}); 
	$scope.protocolChoices = [
		{ label: $tr(gettext("UDP")), value: "udp" }, 
		{ label: $tr(gettext("TCP")), value: "tcp" }, 
		{ label: $tr(gettext("TCP + UDP")), value: "tcpudp" }
	]; 
	$scope.rangeTypes = [
		[false, $tr(gettext('Port'))], 
		[true, $tr(gettext('Port range'))]
	]; 
	
	$scope.deviceChoices = [];
	$network.getConnectedClients().done(function(clients){
		var choices = []; 
		clients.map(function(c) {
			choices.push({
				label: (c.hostname && c.hostname.length)?c.hostname:c.ipaddr, 
				value: c.ipaddr
			}); 
		}); 
		$scope.deviceChoices = choices; 
		$scope.$apply(); 
	});
	$scope.onPortRangeClick = function(value){
		$scope.portIsRange = value;  
	}
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Zone does not exist!":"","Rule name can not be empty!":"","Source port can not be empty!":"","Dest. port can not be empty!":"","Please select a rule to delete!":"","Are you sure you want to delete this rule?":"","Please select a zone to delete!":"","Are you sure you want to delete this zone?":"","Parental Rule":"","ACCEPT":"","REJECT":"","FORWARD":"","DROP":"","Unspecified":"","Any":"","Please select a connection in the list!":"","Are you sure you want to remove this network from this zone?":"","UDP":"","TCP":"","TCP + UDP":"","MAC Address":"","Select Existing Host":"","Invalid MAC address":"","Name":"","Source zone":"","IP":"","IP Address":"","MAC":"","Port":"","Destination zone":"","Family":"","Protocol":"","Firewall Action":"","Source":"","Destination":"","URL":"","Enable WAN forwarding for this service":"","Configure firewall rule for this service":"","Default Policy":"Default Policy","Zone members:":"Zone members:","Input":"","Output":"","Forward":"","Rule Name":"Rule Name","Select Zone":"","Destination Zone":"","Source IP Address":"","Select connected device":"","Source Zone":"","Dst. Device":"Dst. Device","Dst. IP Address":"","Public port":"","Public port range":"","Private port":"Private port","Private port range":"","Select protocol":"","Device":"Device","Local IP Address":"","Type":"","DMZ / Exposed Host":"","internet.exposed_host.info":"If you have a local network device that cannot run an Internet application properly behind the firewall, you can allow unrestricted Internet access to the network device (Exposed Host).","Enable":"","WAN IP Address":"","Host IPv4 Address":"","Host IPv6 Address":"","IPv6 Address":"","Pick Existing Host":"","Choose the local IP address that should be exposed to Internet. Additionally you should configure this IP address as static DHCP address for your device (see Settings/Network).":"","Packet Forwarding":"","internet.firewall.forwarding.info":"Packet forwarding enables forwarding of incoming packets from one network interface to another. Normally this should only be enabled going from 'lan' interface to a 'wan' interface. If you would like to enable forwarding from wan to lan, make sure you know what you are doing.","Enable firewall":"","Enable NAT":"","Firewall settings":"","internet.firewall.info":"Firewall allows you to filter traffic, set up port forwarding or expose certain services to the outside world. ","to":"To","Add / Edit Port Mapping":"","Cancel":"","Save":"","Port Mapping":"","Port mapping allows remote computers to connect to a specific device within your private network.":"","Direction":"","Dst. IP":"","Local port":"","Public Port":"","Firewall Rules":"","internet.firewall.rules.info":"Firewall rules are more fine grained filtering rules for filtering your traffic. ","Allow WAN Access To Running Services":"","internet.wan.services.info":"WAN Services configuration","Service Filtering":"Service Filtering","internet.firewall.svcfilter.info":"This filter allows you to filter out packets going out to a specific port. ","URL Filtering":"","internet.firewall.urlfilter.info":"URL filtering allows you to filter out dns requests to specific URL's. Warning: this still does not prevent the user from using an IP address directly. ","Add URL's to URL blocking list":"","Firewall Zones":"","internet.firewall.zones.info":"Here you can configure firewall zones. Each zone can contain multiple networks, or interfaces, which you have set up earlier. ","URL Blocking":"","Parental Control":"","internet.parental.control.info":"Here you can setup parental control settings. ","URL Blocking Function":"","Internet Access Scheduling":"","Weekdays":"","Start Time":"","Stop Time":"","MAC Addresses":"","internet-firewall-forwarding-title":"Forwarding","internet-firewall-wordfilter-title":"Word Filter","internet-parental-control-title":"Parental Control","internet-firewall-zones-title":"Firewall Zones","internet-firewall-port-mapping-title":"Port Forwarding","internet-firewall-services-title":"Services","internet-firewall-title":"Firewall","internet-firewall-dmz-title":"DMZ","internet-firewall-svcfilter-title":"Service Filter","internet-firewall-rules-title":"Firewall Rules","internet-firewall-urlblock-title":"URL Blocking Filter","menu-internet-firewall-forwarding-title":"Zone Forwarding","menu-internet-firewall-wordfilter-title":"Word Filter","menu-internet-parental-control-title":"Parental Control","menu-internet-firewall-zones-title":"Zones","menu-internet-firewall-port-mapping-title":"Port Forwarding","menu-internet-firewall-services-title":"Services","menu-internet-firewall-title":"Firewall","menu-internet-firewall-dmz-title":"DMZ","menu-internet-firewall-svcfilter-title":"Service Filter","menu-internet-firewall-rules-title":"Rules","menu-internet-firewall-urlblock-title":"URL Blocking"});
	gettextCatalog.setStrings('fi', {"Please select a rule to delete!":"Valitse poistettava sääntö!","Are you sure you want to delete this rule?":"Haluatko varmasti poistaa tämän säännön?","Please select a zone to delete!":"Valitse poistettava vyöhyke!","Are you sure you want to delete this zone?":"Haluatko varmasti poistaa tämän vyöhykkeen?","Parental Rule":"Vanhempien sääntö","ACCEPT":"HYVÄKSY","REJECT":"HYLKÄÄ","FORWARD":"EDELLEENLÄHETYS","DROP":"HYLKÄÄ","Unspecified":"Määrittelemätön","Any":"Kaikki","Please select a connection in the list!":"Valitse yhteys luettelosta!","Are you sure you want to remove this network from this zone?":"Haluatko varmasti poistaa tämän verkon tältä vyöhykkeeltä?","UDP":"UDP","TCP":"TCP","TCP + UDP":"TCP +  UDP","MAC Address":"MAC Osoite","Select Existing Host":"Valitse olemassa oleva isäntäkone","Invalid MAC address":"Virheellinen MAC osoite","Name":"Nimi","Source zone":"Lähde vyöhyke","IP":"IP","IP Address":"IP osoite","MAC":"MAC","Port":"Portti","Destination zone":"Kohde","Family":"Perhe","Protocol":"Protokolla","Firewall Action":"Palomuuritoiminto","Source":"Lähde","Destination":"Kohde","URL":"URL","Enable WAN forwarding for this service":"Salli WAN pääsy tähän palveluun","Configure firewall rule for this service":"Määritä palomuurisääntö tälle palvelulle","Default Policy":"Oletussääntö","Zone members:":"Vyöhykkeen jäsenet:","Input":"Input","Output":"Output","Forward":"Forward","Rule Name":"Säännön Nimi","Select Zone":"Valitse vyöhyke","Destination Zone":"Kohdevyöhyke","Source IP Address":"Lähdeosoite","Select connected device":"Valitse yhdistetty laite","Source Zone":"Alue","Dst. Device":"Kohdelaite","Dst. IP Address":"Kohdeosoite","Public port":"Julkinen Portti","Public port range":"Julkinen porttialue","Private port":"Yksityinen portti","Private port range":"Yksityinen porttialue","Select protocol":"Valitse protokolla","Device":"Laite","Local IP Address":"Paikallinen IP osoite","Type":"Palvelutyyppi","DMZ / Exposed Host":"DMZ / Exposed Host","internet.exposed_host.info":"DMZ ohjaa kaiken julkisen IPv4-liikenteen haluamaasi lähiverkon (LAN) käyttölaitteeseen palomuurin ohi.","Enable":"Ota käyttöön","WAN IP Address":"WAN Osoite","Host IPv4 Address":"IPv4-osoite","Host IPv6 Address":"IPv6-osoite","IPv6 Address":"IPv6-osoite","Pick Existing Host":"Valitse isäntäkone","Choose the local IP address that should be exposed to Internet. Additionally you should configure this IP address as static DHCP address for your device (see Settings/Network).":"Valitse paikallinen IP-osoite, jonka tulisi olla avoin Internettiin. Lisäksi kannattaa määrittää tälle IP-osoitteelle staattinen IP-osoite DHCP poolista (katso Asetukset/Verkko).","Firewall Forwarding":"Palomuuri Edelleenlähetys","internet.firewall.forwarding.info":"Valitse liikenteen salliminen vyöhykkeiden välillä","Enable firewall":"Ota palomuuri käyttöön","Enable NAT":"Aktivoi NAT","Firewall settings":"Palomuuriasetukset","internet.firewall.info":"Palomuurilla voidaan suodattaa liikennettä ja konfiguroida porttiohjauksia","to":" ","Add / Edit Port Mapping":"Lisää / Muokkaa porttiohjausta","Cancel":"Peruuta","Save":"Tallenna","Port Mapping":"Porttiohjaus","Port mapping allows remote computers to connect to a specific device within your private network.":"Porttiohjauksella sallitaan yhteys ulkoverkosta sisäverkon laitteen osoitteeseen.","Direction":"Suunta","Dst. IP":"Dst. IP","Local port":"Paikallinen portti","Public Port":"Julkinen Portti","Rules":"Säännöt","internet.firewall.rules.info":"Palomuurisäännöillä voidaan määritellä tarkempia suodatussääntöjä.","Allow WAN Access To Running Services":"Salli WAN-pääsy käynnissä oleviin palveluihin","internet.wan.services.info":"Palvelut","Service Filtering":"Palvelu suodatus","internet.firewall.svcfilter.info":" ","URL Filtering":"URL","internet.firewall.urlfilter.info":"URL suodatus mahdollistaa DNS kyselyiden suodattamisen haluttuihin osoitteisiin. Varoitus: tämä ei siltikään estä käyttäjää saavuttamasta kohdesivua IP-osoitetta käyttämällä.","Add URL's to URL blocking list":"Lisää URL estolistalle","Firewall Zones":"Palomuurivyöhykkeet","internet.firewall.zones.info":"Tässä voit asettaa palomuurivyöhykkeitä. Jokainen vyöhyke voi sisältää useita verkkoja tai liitäntöjä, jotka on asetettu aiemmin Yhteydet-sivulla.","URL Blocking":"URL Estäminen","Parental Control":"Lapsilukko","internet.parental.control.info":"Tässä voidaan asettaa lapsilukon asetukset.","URL Blocking Function":"Lisää URL estolistalle","Internet Access Scheduling":"Internetyhteyden ajoitus","Weekdays":"MA – PE, Arkisin","Start Time":"Aloitusaika","Stop Time":"Lopetusaika","MAC Addresses":"MAC-osoitteet","internet-firewall-zones-title":"Palomuurivyöhykkeet","internet-firewall-port-mapping-title":"Porttiohjaus","internet-firewall-wordfilter-title":"Sanasuodatin","internet-firewall-svcfilter-title":"SVC","internet-firewall-title":"Palomuuri","internet-firewall-rules-title":"Palomuurisäännöt","internet-firewall-dmz-title":"DMZ","internet-parental-control-title":"Lapsilukko","internet-firewall-forwarding-title":"Edelleenlähetys","internet-firewall-services-title":"Palvelut","internet-firewall-urlblock-title":"URL esto","menu-internet-firewall-zones-title":"Vyöhykkeet","menu-internet-firewall-port-mapping-title":"Porttiohjaus","menu-internet-firewall-wordfilter-title":"Sanasuodatin","menu-internet-firewall-svcfilter-title":"SVC","menu-internet-firewall-title":"Palomuuri","menu-internet-firewall-rules-title":"Palomuurisäännöt","menu-internet-firewall-dmz-title":"DMZ","menu-internet-parental-control-title":"Lapsilukko","menu-internet-firewall-forwarding-title":"Edelleenlähetys","menu-internet-firewall-services-title":"Palvelut","menu-internet-firewall-urlblock-title":"URL esto"});
	gettextCatalog.setStrings('sv-SE', {"Please select a rule to delete!":"Välj regel du vill ta bort","Are you sure you want to delete this rule?":"Är du säker på att du vill ta bort denna regel? ","Please select a zone to delete!":"Välj zon som du vill ta bort","Are you sure you want to delete this zone?":"Är du säker på att du vill ta bort denna zon? ","Parental Rule":"Föräldrakontroll","ACCEPT":"TA EMOT","REJECT":"AVVISA","FORWARD":"SKICKA VIDARE","DROP":"DROP","Unspecified":"Ospecifierad","Any":"Vilken som helst","Please select a connection in the list!":"Välj en uppkoppling från listan!","Are you sure you want to remove this network from this zone?":"Är du säker på att du vill ta bort denna nätverkszon? ","UDP":"","TCP":"","TCP + UDP":"","MAC Address":"MAC-adress","Select Existing Host":"Välj befintlig enhet","Invalid MAC address":"Ogiltigt MAC adress","Name":"Namn","Source zone":"Käll-zon","IP":"IP","IP Address":"IP-adress","MAC":"MAC","Port":"Port","Destination zone":"Destinations-zon","Family":"Familj","Protocol":"Protokol","Firewall Action":"Åtgärd","Source":"Källa","Destination":"Destination","URL":"URL","Enable WAN forwarding for this service":"Slå på WAN forwarding för denna tjänst","Configure firewall rule for this service":"Konfigurera brandväggsregel för denna tjänst","Default Policy":"Default Policy","Zone members:":"Zonnummer","Input":"In","Output":"Ut","Forward":"Skicka vidare","Rule Name":"Namn","Select Zone":"Välj zon","Destination Zone":"Destinations-zon","Source IP Address":"","Select connected device":"Välj uppkopplad enhet","Source Zone":"Käll-zon","Dst. Device":"Destinations-enhet","Dst. IP Address":"Dest. IP Adress","Public port":"Publik port","Public port range":"Publik portintervall","Private port":"Privat port","Private port range":"Privat port-spann","Select protocol":"Välj protokol","Device":"Enhet","Local IP Address":"Lokal IP-adress","Type":"Typ","DMZ / Exposed Host":"DMZ","internet.exposed_host.info":"DMZ inställnignar","Enable":"Aktivera","WAN IP Address":"WAN IP-adress","Host IPv4 Address":"Klientens IPv4-adress","Host IPv6 Address":"Klientens IPv4-adress","IPv6 Address":"IPv6-adress","Pick Existing Host":"Välj befintlig klient","Choose the local IP address that should be exposed to Internet. Additionally you should configure this IP address as static DHCP address for your device (see Settings/Network).":"Välj vilken lokal IP-adress som ska exponeras mot Internet. Du bör konfigurera den enheten med statisk DHCP-adress (inställningen finns i Inställningar/Nätverk). ","Firewall Forwarding":"Vidarebefordring","internet.firewall.forwarding.info":"Skicka vidare paket","Enable firewall":"Aktivera brandvägg","Enable NAT":"Aktivera NAT","Firewall settings":"Brandväggsinställningar","internet.firewall.info":"Brandväggsinställningar","to":"till","Add / Edit Port Mapping":"Lägg till / ändra portmappning","Cancel":"Avbryt","Save":"Spara","Port Mapping":"Portmappning","Port mapping allows remote computers to connect to a specific device within your private network.":"Portmappning tillåter andra datorer på internet att koppla upp sig till datorer på ditt lokala nätverk","Direction":"Riktning","Dst. IP":"Dest. IP","Local port":"Lokal port","Public Port":"Publikt port","Rules":"Regler","internet.firewall.rules.info":"Ställ in regler för brandväggen","Allow WAN Access To Running Services":"Tillåt WAN access till startade tjänster","internet.wan.services.info":"Tjänster och program på WAN sidan","Service Filtering":"Tjänstefiltrering","internet.firewall.svcfilter.info":"Tjänstefilter","URL Filtering":"URL-filtrering","internet.firewall.urlfilter.info":"Här kan du ställa in addressfilter","Add URL's to URL blocking list":"Lägg till URL till blockeringslistan","Firewall Zones":"Zoner","internet.firewall.zones.info":"Här kan du skapa och ändra inställningar på olika zoner på brandväggen","URL Blocking":"URL-blockering","Parental Control":"Föräldrakontroll","internet.parental.control.info":"Här kan du ställa in routerns barnvänlighet","URL Blocking Function":"URL blockering","Internet Access Scheduling":"Schemaläggning","Weekdays":"Veckodagar","Start Time":"Start-tid","Stop Time":"Stopp tid","MAC Addresses":"MAC-adresser","internet-firewall-zones-title":"Zoner","internet-firewall-port-mapping-title":"Port-mappning","internet-firewall-wordfilter-title":"Ordfilter","internet-firewall-svcfilter-title":"Tjänstefilter","internet-firewall-title":"Brandvägg","internet-firewall-rules-title":"Brandväggsregler","internet-firewall-dmz-title":"DMZ","internet-parental-control-title":"Föräldrakontroll","internet-firewall-forwarding-title":"Paketforwarding","internet-firewall-services-title":"Tjänster","internet-firewall-urlblock-title":"URL-blockering","menu-internet-firewall-zones-title":"Zoner","menu-internet-firewall-port-mapping-title":"Port-mappning","menu-internet-firewall-wordfilter-title":"Ordfilter","menu-internet-firewall-svcfilter-title":"Tjänstefilter","menu-internet-firewall-title":"Brandvägg","menu-internet-firewall-rules-title":"Brandväggsregler","menu-internet-firewall-dmz-title":"DMZ","menu-internet-parental-control-title":"Föräldrakontroll","menu-internet-firewall-forwarding-title":"Paketforwarding","menu-internet-firewall-services-title":"Tjänster","menu-internet-firewall-urlblock-title":"URL-blockering"});
}]);

