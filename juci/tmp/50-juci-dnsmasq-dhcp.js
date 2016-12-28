
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

UCI.$registerConfig("dhcp"); 
UCI.dhcp.$registerSectionType("dnsmasq", {
	"domainneeded":		{ dvalue: true, type: Boolean },
	"dhcpleasemax":		{ dvalue: undefined, type: Number },
	"boguspriv":		{ dvalue: true, type: Boolean },
	"localise_queries":	{ dvalue: true, type: Boolean },
	"rebind_protection":{ dvalue: false, type: Boolean },
	"rebind_localhost":	{ dvalue: false, type: Boolean },
	"dnsforwardmax":	{ dvalue: undefined, type: Number },
	"rebind_domain":	{ dvalue: [], type: Array },
	"ednspacket_max":	{ dvalue: undefined, type: Number },
	"local":			{ dvalue: "", type: String, required: true},
	"port":				{ dvalue: 53, type: Number },
	"domain":			{ dvalue: "", type: String, required: true},
	"logqueries":		{ dvalue: false, type: Boolean },
	"filterwin2k":		{ dvalue: false, type: Boolean },
	"queryport":		{ dvalue: undefined, type: Number },
	"addnhosts":		{ dvalue: [], type: Array },
	"bogusnxdomain":	{ dvalue: [], type: Array },
	"server":			{ dvalue: [], type: Array },
	"noresolv":			{ dvalue: false, type: Boolean },
	"nonegcache":		{ dvalue: false, type: Boolean },
	"strictorder":		{ dvalue: false, type: Boolean },
	"expandhosts":		{ dvalue: true, type: Boolean },
	"authoritative":	{ dvalue: true, type: Boolean },
	"readethers":		{ dvalue: true, type: Boolean },
	"leasefile":		{ dvalue: "/tmp/dhcp.leases", type: String },
	"resolvfile":		{ dvalue: "/tmp/resolv.conf.auto", type: String }
});
UCI.dhcp.$registerSectionType("dhcp", {
	"interface":		{ dvalue: "", type: String, required: true},
	"start":		{ dvalue: 100, type: Number, validator: UCI.validators.NumberLimitValidator(1, 255) },
	"limit":		{ dvalue: 150, type: Number, validator: UCI.validators.NumberLimitValidator(1, 255) },
	"leasetime":		{ dvalue: "12h", type: String, required: true},
	"ignore":		{ dvalue: false, type: Boolean }
});
UCI.dhcp.$registerSectionType("domain", {
	"name":		{ dvalue: [], type: Array, },
	"ip":		{ dvalue: "", type: String, required: true },  // TODO: change to ip address
	"family":	{ dvalue: "ipv4", type: String, required: true }
});
UCI.dhcp.$registerSectionType("host", {
	"name":		{ dvalue: "", type: String, required: false},
	"dhcp":		{ dvalue: "", type: String, required: true},
	"network": { dvalue: "lan", type: String, required: true }, 
	"mac":		{ dvalue: "", type: String, required: true, validator: UCI.validators.MACAddressValidator },
	"ip":		{ dvalue: "", type: String, required: true, validator: UCI.validators.IPAddressValidator },  // TODO: change to ip address
	"duid": 	{ dvalue: "", type: String }, 
	"hostid": 	{ dvalue: "", type: String }
}, function(sec){
	// make sure we throw an error if there are duplicates
	return ["name", "mac", "ip", "duid", "hostid"].map(function(f){
		var dups = UCI.dhcp["@host"].filter(function(x){ 
			return x != sec && sec[f].value && sec[f].value == x[f].value; 
		}); 
		if(dups.length) {
			return gettext("Duplicate DHCP entry for") + " '" + sec[f].value + "'"; 
		}
	}).filter(function(x){ return x; }); 	
}); 

JUCI.app.factory("lanIpFactory", function($firewall, $tr, gettext){
	return {
		getIp: function(){
			var deferred = $.Deferred();
			var res = { ipv6:"LAN does not have IPv6 configured", ipv4:"LAN does not have IPv4 configured"};
			$firewall.getZoneNetworks("lan").done(function(networks){
				if(networks.length == 0 || !networks[0].$info) return;
				if(networks[0].$info["ipv4-address"].length != 0 && networks[0].$info["ipv4-address"][0].address){
					res.ipv4 = networks[0].$info["ipv4-address"][0].address;
				}
				if(networks[0].$info["ipv6-address"].length == 0 || !networks[0].$info["ipv6-address"][0].address){
					if(networks[0].$info["ipv6-prefix-assignment"].length != 0 && networks[0].$info["ipv6-prefix-assignment"][0].address){
						res.ipv6 = networks[0].$info["ipv6-prefix-assignment"][0].address + "1";
					}else{ 
						res.ipv6 = $tr(gettext("LAN does not have IPv6 configured"));
					}
				}else{
					res.ipv6 = networks[0].$info["ipv4-address"][0].address;
				}
				deferred.resolve(res);
			});
			return deferred;
		}
	}
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
.controller("dhcpSettingsPage", function($scope, $uci){
	$uci.$sync(["dhcp"]).done(function(){
		$scope.dnsmasq = $uci.dhcp["@dnsmasq"][0];
		$scope.hostfiles = $scope.dnsmasq.addnhosts.value.map(function(x){
			return { label: x };
		});
		$scope.bogusnxdomain = $scope.dnsmasq.bogusnxdomain.value.map(function(host){ return { label: host }});
		$scope.server = $scope.dnsmasq.server.value.map(function(server){ return { label: server }});
		$scope.rebind_domain = $scope.dnsmasq.rebind_domain.value.map(function(domain){ return { label: domain }});
		$scope.$apply();
	});	
	$scope.$watch("rebind_domain", function onDhcpSettingsRebindDomainChanged(){
		if(!$scope.server) return;
		$scope.dnsmasq.rebind_domain.value = $scope.rebind_domain.map(function(x){ return x.label });
	}, true);
	$scope.$watch("server", function onDhcpSettingsServerChanged(){
		if(!$scope.server) return;
		$scope.dnsmasq.server.value = $scope.server.map(function(x){ return x.label });
	}, true);
	$scope.$watch("bogusnxdomain", function onDhcpBogusNXDomainChanged(){
		if(!$scope.bogusnxdomain) return;
		$scope.dnsmasq.bogusnxdomain.value = $scope.bogusnxdomain.map(function(x){ return x.label });
	}, true);
	$scope.$watch("hostfiles", function onDhcpHostFilesChanged(){
		if(!$scope.hostfiles) return;
		$scope.dnsmasq.addnhosts.value = $scope.hostfiles.map(function(x){return x.label});
	}, true);
	$scope.on_port_change = function(option){
		if($scope.dnsmasq[option] && $scope.dnsmasq[option].value){
			$scope.dnsmasq[option].value = $scope.dnsmasq[option].value.replace(/[^0-9]/g, "");
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
.controller("dhcpStatusPage", function(){});

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
.directive("dhcpBasicSettingsEdit", function($compile){
	return {
		scope: {
			dhcp: "=ngModel", 
			connection: "=ngConnection"
		}, 
		templateUrl: "/widgets/dhcp-basic-settings-edit.html", 
		controller: "dhcpBasicSettingsEdit"
	};  
})
.controller("dhcpBasicSettingsEdit", function($scope, $network, $tr, gettext){
	
	$scope.dhcpLeaseTimes = [
		{ label: "5 "+$tr(gettext("Minutes")), value: "5m"}, 
		{ label: "30 "+$tr(gettext("Minutes")), value: "30m"}, 
		{ label: "1 "+$tr(gettext("Hour")), value: "1h" }, 
		{ label: "6 "+$tr(gettext("Hours")), value: "6h" }, 
		{ label: "12 "+$tr(gettext("Hours")), value: "12h" }, 
		{ label: "24 "+$tr(gettext("Hours")), value: "24h" } 
	];  
	
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
.directive("dhcpEntryEdit", function(){
	return {
		scope: {
			dhcp: "=ngModel"
		}, 
		templateUrl: "/widgets/dhcp-entry-edit.html", 
		controller: "dhcpEntryEdit", 
		replace: true
	};  
})
.controller("dhcpEntryEdit", function($scope, $network){
	$network.getNetworks().done(function(nets){
		$scope.availableNetworks = nets.map(function(n){
			return { label: n[".name"], value: n[".name"] }; 
		}); 
	}); 
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

JUCI.app.directive("dhcpHostEntriesEdit", function(){
	return {
		scope: {
			model: "=ngModel"
		},
		templateUrl: "/widgets/dhcp-host-entries-edit.html",
		controller: "dhcpHostEntriesEditCtrl",
		replace: true
	}
}).controller("dhcpHostEntriesEditCtrl", function($scope, $firewall, $uci, $tr, gettext, lanIpFactory){
	$firewall.getZoneClients("lan").done(function(clients){
		$scope.clients = clients.map(function(x){
			var name = x.ipaddr + ((x.hostname == "") ? "" : " (" + x.hostname + ")");
			return { label: name, value: x.ipaddr }
		});
	});
	$scope.placeholder = {};
	lanIpFactory.getIp().done(function(res){
		$scope.placeholder.ipv4 = res.ipv4;
		$scope.placeholder.ipv6 = res.ipv6;
	});

	$scope.onAddressTypeChange = function(value){
		if(!$scope.model) return;
		$scope.model.ip.value = "";
		$scope.model.ip.validator = (value == 'ipv4') ? new $uci.validators.IP4AddressValidator() : new $uci.validators.IP6AddressValidator();
	};
	$scope.ipAddressTypes = [
		{ label: $tr(gettext("IPv4")),	value: "ipv4" },
		{ label: $tr(gettext("IPv6")),	value: "ipv6" }
	];
	$scope.$watch("model", function onDhcpHostModelChanged(){
		if(!$scope.model) return;
		$scope.model.ip.validator = ($scope.model.family.value == 'ipv4') ? new $uci.validators.IP4AddressValidator(): new $uci.validators.IP6AddressValidator();
		$scope.names = $scope.model.name.value.map(function(name){ return { value: name }});
	}, false);
	$scope.$watch("names", function onDhcpHostNamesChanged(){
		if(!$scope.names) return;
		$scope.model.name.value = $scope.names.map(function(name){ return name.value });
	}, true);
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

JUCI.app.directive("dhcpHostEntries", function(){
	return {
		scope: true,
		templateUrl: "/widgets/dhcp-host-entries.html",
		controller: "dhcpHostEntriesCtrl",
		replace: true
	}
}).controller("dhcpHostEntriesCtrl", function($scope, $uci, $tr, gettext, lanIpFactory){
	$uci.$sync("dhcp").done(function(){
		$scope.hosts = $uci.dhcp["@domain"];
		$scope.$apply();
	});
	$scope.ipv4 = "";
	$scope.ipv6 = "";
	
	lanIpFactory.getIp().done(function(res){
		$scope.ipv4 = res.ipv4;
		$scope.ipv6 = res.ipv6;
	});
	
	$scope.getItemTitle = function(item){
		return $tr(gettext("Hostname(s) for ")) + ((item.ip.value == "") ? ((item.family.value == "ipv4") ? $scope.ipv4 : $scope.ipv6) : item.ip.value);
	}
	$scope.onAddDomain = function(){
		$uci.dhcp.$create({ ".type":"domain", "family":"ipv4"}).done(function(){
			$scope.$apply();
		});
	};
	$scope.onDeleteDomain = function(domain) {
		domain.$delete().done(function(){
			$scope.$apply();
		});
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
.directive("dhcpLeasesWidget", function(){
	return {
		scope: true,
		templateUrl: "/widgets/dhcp-leases-widget.html",
		controller:	"dhcpLeasesWidget"
	}
})
.controller("dhcpLeasesWidget", function($rpc, $uci, $scope){
	JUCI.interval.repeat("ipv4leases", 1000, function(done){
		$rpc.juci.dhcp.ipv4leases().done(function(data){
			$scope.ipv4leases = data.leases;
			$scope.$apply();
		}).always(function(){
			done();
		});
	});
	JUCI.interval.repeat("ipv6leases", 1000, function(done){
		$rpc.juci.dhcp.ipv6leases().done(function(data){
			$scope.ipv6leases = data.leases.filter(function(x){ return x.leasetime; });
			$scope.$apply();
		}).always(function(){
			done();
		});
	});
	function pad(a){
		if(a < 10) return "0"+a;
		return ""+a;
	};
	$scope.to_time_remaining = function(time){
		if(!time) time = (new Date()).getTime(); // prevent NaN!
		var date_now = new Date();
		var time_now = date_now.getTime();
		var time_left = (time - (time_now /1000))
		var days = Math.floor(time_left / 86400)
		time_left = time_left - days * 86400;
		var h = Math.floor(time_left / 3600);
		time_left = time_left - h * 3600;
		var m = Math.floor(time_left / 60);
		var s = Math.round(time_left - m * 60);
		if( days > 0){
			return (pad(days) + " " + pad(h) + ":" + pad(m) + ":" + pad(s)); 
		}
		return (pad(h) + ":" + pad(m) + ":" + pad(s));
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
.directive("dhcpStaticHostsEdit", function($compile){
	return {
		scope: {
			dhcp: "=ngModel"
		}, 
		templateUrl: "/widgets/dhcp-static-hosts-edit.html", 
		controller: "dhcpStaticHostsEdit", 
		replace: true
	};  
})
.controller("dhcpStaticHostsEdit", function($scope, $network, $uci){
	$scope.$watch("dhcp", function onDhcpStaticModelChanged(dhcp){
		if(!dhcp) return; 
		
		$network.getConnectedClients().done(function(clients){
			// we do not sync uci here because we only use this control inside dhcp pages that do that already
			dhcp.staticHosts = $uci.dhcp["@host"].filter(function(host){
				return host.dhcp.value == dhcp[".name"] || host.network.value == dhcp[".name"];  
			}); 
			dhcp.connectedHosts = clients.filter(function(cl){
				// filter out only clients that are connected to network that this dhcp entry is servicing
				//return cl.network == dhcp.interface.value; 
				return true; // for now let's include all of them since the new lua based clients listing does not supply us with "network" field. 
			}).map(function(cl){
				return {
					label: cl.hostname || cl.ipaddr || cl.ip6addr, 
					value: cl
				}; 
			}); 
			$scope.$apply(); 
		}); 
	}); 
	
	$scope.onAddStaticDHCP = function(){
		if(!$scope.dhcp) return; 
		var host = $scope.existingHost || { };
		$uci.dhcp.$create({
			".type": "host", 
			dhcp: $scope.dhcp[".name"], 
			network: $scope.dhcp.interface.value, 
			name: host.hostname ,
			mac: host.macaddr, 
			ip: host.ipaddr,
			duid: host.ip6duid
		}).done(function(section){
			console.log("Added new dhcp section"); 
			$scope.dhcp.staticHosts.push(section); 
			$scope.$apply(); 
		}).fail(function(err){
			console.error("Failed to add new static dhcp entry: "+err); 
		}); 
	}
	$scope.onRemoveStaticDHCP = function(host){
		if(!host || !$scope.dhcp) return; 
		host.$delete().done(function(){
			$scope.dhcp.staticHosts = $scope.dhcp.staticHosts.filter(function(x){ return x.mac.value != host.mac.value; }); 
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

// this control gets pointer to network connection and looks up proper dhcp server entry for it. 

JUCI.app
.directive("networkConnectionDhcpServerSettings", function($compile){
	return {
		scope: {
			connection: "=ngConnection"
		}, 
		templateUrl: "/widgets/network-connection-dhcp-server-settings.html", 
		controller: "networkConnectionDhcpServerSettings"
	};  
})
.controller("networkConnectionDhcpServerSettings", function($scope, $network, $uci){
	$scope.data = {}; 
	$scope.data.dhcpEnabled = false; 
	$scope.$watch("connection", function onNetworkConnectionModelChanged(value){
		if(!value) return; 
		$uci.$sync("dhcp").done(function(){
			$scope.dhcp = $uci.dhcp["@dhcp"].find(function(x){
				return x.interface.value == value[".name"] || x[".name"] == value[".name"]; 
			}); 
			if($scope.dhcp) $scope.data.dhcpEnabled = $scope.dhcp && !$scope.dhcp.ignore.value; 
			$scope.$apply(); 
		}); 
	}); 
	$scope.$watch("data.dhcpEnabled", function(value){
		if($scope.connection && $scope.connection.proto && $scope.connection.proto.value == "static") {
			if($scope.dhcp == undefined){
				$uci.dhcp.$create({
					".type": "dhcp", 
					".name": $scope.connection[".name"],
					"interface": $scope.connection[".name"],
					"ignore": !value
				}).done(function(dhcp){
					$scope.dhcp = dhcp; 
					$scope.$apply(); 
				}); 
			} else {
				$scope.dhcp.ignore.value = !value; 
			}
		}
	}); 
}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Minutes":"","Hour":"","Hours":"","Address Pool Start IP":"","Address Pool End IP":"","DHCP Lease Time":"","Lease Time":"","Connection":"","Network":"Network","DHCPv4 leases":"","DHCPv6 leases":"","Active DHCP Leases":"","Hostname":"","IPv4-Address":"","MAC-Address":"","Leasetime remaining":"","There are no active leases":"","IPv6-Address":"","DUID":"","MAC":"","IPv4 Address":"","IPv6 Unique ID":"","IPv6 Address ID":"","Add Connected Host":"","Static DHCP":"","Device Name":"Device Name","MAC Address":"","IP Address":"","DUID (IPv6)":"","Host ID (IPv6)":"","DHCP Server":"","General Settings":"General Settings","Local domain":"","Local domain suffix appended to DHCP names and hosts file entries":"","Log queries":"","Write received DNS requests to syslog":"","Leasefile":"","file where given DHCP-leases will be stored":"","Ignore resolve file":"","Resolve file":"","local DNS file":"","Ignore Hosts file":"","Advanced Settings":"Advanced Settings","Domain required":"","Do not forward DNS-Requests without DNS-Name":"","Authoritative":"","This is the only DHCP in the local network":"","Filter private":"","Do not forward reverse lookups for local networks":"","Filter usless":"","Do not forward requests that cannot be answered by public name servers":"","Localise queries":"","Localise hostname depending on the requesting subnet if multiple IPs are available":"","Local server":"","Local domain specification. Names matching this domain are never forwared and resolved from DHCP or hosts files only":"","Expand hosts":"","Add local domain suffix to names served from hosts files":"","No negative cache":"","Do not cache negative replies, e.g. for not existing domains":"","Strict order":"","DNS servers will be queried in the order of the resolvfile":"","Bogus NX Domain Override":"","List of hosts that supply bogus NX domain results":"","ex. 67.215.65.132":"","DNS forwarding":"","List of DNS servers to forward requests to":"","ex. /example.org/10.1.2.3":"","Rebind protection":"","Discard upstream RFC1918 responses":"","Allow localhost":"","Allow upstream responses in the 127.0.0.0/8 range, e.g. for RBL services":"","Domain whitelist":"","List of domains to allow RFC1918 responses for":"","ex. ihost.netflix.com":"","DNS server port":"","Listening port for inbound DNS queries":"","DNS query port":"","Fixed source port for outbound DNS queries":"","Max DHCP leases":"","Maximum allowed number of active DHCP leases":"","Max. EDNS0 packet size":"","Maximum allowed size of EDNS.0 UDP packets":"","Max. concurrent queries":"","Maximum allowed number of concurrent DNS queries":"","dhcp-status-title":"DHCP Status","dhcp-settings-title":"DHCP Settings","menu-dhcp-status-title":"DHCP Status","menu-dhcp-settings-title":"DHCP"});
	gettextCatalog.setStrings('fi', {"Hour":"Tunti","Hours":"Tuntia","Forever":"Aina","Address Pool Start IP":"Ensimmäinen osoite","Address Pool End IP":"Viimeinen osoite","DHCP Lease Time":"DHCP-varauksen aika","Lease Time":"Vuokra-aika","Connection":"Yhteys","Network":"Verkko","Hostname":"Isäntäkoneen nimi","MAC":"MAC","IPv4 Address":"IPv4-osoite","IPv6 Unique ID":"IPv6 Unique ID","IPv6 Address ID":"IPv6-osoite ID","Add Connected Host":"Lisää isäntäkone","Static DHCP":"Kiinteä DHCP","Device Name":"Laitteen nimi","MAC Address":"MAC-osoite","IP Address":"IP-osoite","DUID (IPv6)":"DUID (IPv6)","Host ID (IPv6)":"Host ID (IPv6)","DHCP Server":"DHCP-palvelin"});
	gettextCatalog.setStrings('sv-SE', {"Hour":"Timme","Hours":"Timmar","Forever":"För Alltid","Address Pool Start IP":"Start-IP","Address Pool End IP":"Slut-IP","DHCP Lease Time":"DHCP-lease tid","Lease Time":"Leasetid","Connection":"Uppkoppling","Network":"Nätverk","Hostname":"Datornamn","MAC":"MAC","IPv4 Address":"IPv4-adress","IPv6 Unique ID":"IPv6 unikt ID","IPv6 Address ID":"IPv6-adress ID","Add Connected Host":"Lägg till enhet","Static DHCP":"Statisk DHCP","Device Name":"Enhetsnamn","MAC Address":"MAC-adress","IP Address":"IP-adress","DUID (IPv6)":"IPv6 DUID","Host ID (IPv6)":"IPv6 Värd-ID","DHCP Server":"DHCP server"});
}]);

