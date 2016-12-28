
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
.factory("$samba", function($uci){
	function Samba () {}
	Samba.prototype.getConfig = function(){
		var def = $.Deferred(); 
		$uci.$sync("samba").done(function(){
			if(!$uci.samba["@samba"].length) def.reject(); 
			else def.resolve($uci.samba["@samba"][0]); 
		}).fail(function(){
			def.reject();
		});  
		return def.promise(); 
	}

	Samba.prototype.getShares = function(){
		var def = $.Deferred(); 
		$uci.$sync("samba").done(function(){
			def.resolve($uci.samba["@sambashare"]); 
		}).fail(function(){
			def.reject();
		}); 
		return def.promise();  
	}
	
	Samba.prototype.getUsers = function(){
		var def = $.Deferred(); 
		$uci.$sync("samba").done(function(){
			def.resolve($uci.samba["@sambausers"]); 
		}).fail(function(){
			def.reject(); 
		}); 
		return def.promise(); 
	}
	return new Samba(); 
}); 

UCI.$registerConfig("samba"); 
UCI.samba.$registerSectionType("samba", {
	"name":			{ dvalue: "", type: String }, 
	"workgroup":	{ dvalue: "", type: String },
	"description":	{ dvalue: "", type: String },
	"charset": 		{ dvalue: "", type: String },
	"homes":		{ dvalue: false, type: Boolean },
	"interface":	{ dvalue: "", type: String }
}); 

UCI.samba.$registerSectionType("sambashare", {
	"name":			{ dvalue: "", type: String }, 
	"path":			{ dvalue: "/mnt", type: String },
	"users":		{ dvalue: "", type: String }, // comma separated list
	"read_only":	{ dvalue: "no", type: Boolean }, // Yes/no
	"guest_ok":		{ dvalue: "no", type: Boolean }, // Yes/no
	"create_mask":	{ dvalue: "0700", type: String }, 
	"dir_mask":		{ dvalue: "0700", type: String } 
}); 

UCI.samba.$registerSectionType("sambausers", {
	"user":			{ dvalue: "", type: String }, 
	"password":		{ dvalue: "", type: String },
	"desc": 		{ dvalue: "", type: String }
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
.controller("ServiceSambaPage", function($scope, $tr, gettext, $uci, $samba, gettext, $firewall){
	if(!$uci.samba._exists) {
		$scope.samba_not_installed = true; 
		return; 
	}
	$scope.data = {
		networks: [],
		output: []
	};
	$firewall.getZoneNetworks("lan").done(function(nets){
		$scope.data.networks = nets.map(function(net){
			return { label: String(net[".name"]).toUpperCase(), value: net[".name"] };
		});
		$samba.getConfig().done(function(config){
			$scope.config = config; 
			var saved_nets = $scope.config.interface.value.split(" ").filter(function(sn){
				return $scope.data.networks.find(function(net){return (net.value == sn);}) != null;
			});
			$scope.data.networks.map(function(net){
				net.selected = (saved_nets.find(function(sn){return net.value == sn;}) != null) ? true : false;
			});
			$scope.config.interface.value = saved_nets.join(" ");
			$scope.$apply(); 
		});
	});  
	$scope.$watch("data.output", function onSambaDataOutputChanged(output){
		if(!$scope.data || !$scope.config) return;
		$scope.config.interface.value = output.map(function(net){return net.value;}).join(" ");
	}, false);

	$samba.getShares().done(function(shares){
		$scope.shares = shares; 
		$scope.$apply(); 
	});

	$samba.getUsers().done(function(users){
		$scope.users = users; 
		$scope.$apply(); 
	});

	$scope.getSambaShareTitle = function(share){
		return share.name.value; 
	}

	$scope.onCreateShare = function(){
		$uci.samba.$create({
			".type": "sambashare",
			"name": $tr(gettext("New samba share"))
		}).done(function(){
			$scope.$apply(); 
		}); 
	}

	$scope.onDeleteShare = function($item){
		$item.$delete().done(function(){
			$scope.$apply(); 
		}); 
	}

	$scope.onCreateUser = function(){
		$uci.samba.$create({
			".type": "sambausers",
			"user": "guest"
		}).done(function(){
			$scope.$apply(); 
		}); 
	}

	$scope.onDeleteUser = function($item){
		$item.$delete().done(function(){
			$scope.$apply(); 
		}); 
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
.directive("sambaFileTree", function(){
	return {
		templateUrl: "/widgets/samba-file-tree.html",
		scope: {
			model: "=ngModel"	
		},
		require: "^ngModel",
		controller: "sambaFileTreeController"
	};
}).controller("sambaFileTreeController", function($scope, $rpc, $tr, gettext){
	$scope.data = {
			tree: [{
			label: $tr(gettext("Loading.."))
		}], 
	}; 
	$scope.on_select = function(branch){
		if(!branch || !branch.path) return;
		$scope.model.path = branch.path.slice(4); 
	}
	$rpc.juci.samba.folder_tree().done(function(data){
		function to_tree_format(obj){
			return Object.keys(obj).map(function(folder){
				if(obj[folder]["children"]){
					var tmp = {
						label: "/"+folder+"/",
						path: obj[folder]["path"]
					}
					if(typeof obj[folder]["children"] == "object"){
						tmp.children = to_tree_format(obj[folder]["children"]);
					}
					return tmp;
				}
			});
		}
		$scope.data.tree = to_tree_format(data); 
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

JUCI.app.requires.push("ui.bootstrap.typeahead"); 
JUCI.app.requires.push("ngAnimate"); 

JUCI.app
.directive("sambaShareEdit", function($compile){
	return {
		scope: {
			share: "=ngModel"
		}, 
		templateUrl: "/widgets/samba-share-edit.html", 
		controller: "sambaShareEdit", 
		replace: true
	 };  
})
.controller("sambaShareEdit", function($scope, $network, $modal, $juciDialog, $tr, gettext, $uci){
	$scope.data = {}; 
	$scope.users = {
		all: [],
		out: []
	};

	$scope.$watch("share", function onSambaShareModelChanged(value){
		if(!value) return; 
		$scope.data.model = (value.path.value.length > 3) ? value.path.value.slice(4): "";
		$uci.$sync("samba").done(function(){
			var users = $uci.samba["@sambausers"];
			var selected = value.users.value.split(",").filter(function(u){
				return users.find(function(user){ return user.user.value == u; }) != null;
			});
			$scope.users.all = users.map(function(user){
				var sel = selected.find(function(sel){ return user.user.value == sel; });
				return {label: user.user.value + ((user.desc.value == "") ? "" : " (" + user.desc.value + ")"), value: user.user.value, selected: (sel)? true : false};
			});
			$scope.$apply();
		});
	}); 
	$scope.reloadUsers = function(){
		if(!$scope.share) return;
		$uci.$sync("samba").done(function(){
			var users = $uci.samba["@sambausers"];
			var selected = $scope.share.users.value.split(",").filter(function(u){
				return users.find(function(user){ return user.user.value == u; }) != null;
			});
			$scope.users.all = users.map(function(user){
				var sel = selected.find(function(sel){ return user.user.value == sel; });
				return {label: user.user.value + ((user.desc.value == "") ? "" : " (" + user.desc.value + ")"), value: user.user.value, selected: (sel)? true : false};
			});
			$scope.$apply();
		});
	};

	$scope.$watch("users.out", function onSambaUsersOutChanged(){
		if(!$scope.users || !$scope.users.out || !$scope.share) return;
		$scope.share.users.value = $scope.users.out.map(function(user){ return user.value; }).join(",");
	}, false);
	$scope.$watch("data.model", function onSambaUsersDataModelChanged(value){
		if(!$scope.share) return;
		$scope.share.path.value = "/mnt" + value;
	}, false);

	var def = null
	$scope.onAutocomplete = function(query){
		if(!def){
			var def = $.Deferred(); 
			$scope.loadingLocations = true;
			$rpc.juci.samba.autocomplete({ path: query.slice(1) }).done(function(result){
				def.resolve(result.folders); 
			}).fail(function(){
				def.reject(); 
			}).always(function(){def = null; $scope.loadingLocations = false;});
		}
		return def.promise(); 
	}
	$scope.onAddFolder = function(){
		var model = {}
		$juciDialog.show("samba-file-tree", {
			title: $tr(gettext("Add folder to share")),
			model: model,
			on_apply: function(btn, dlg){
				if(!model.path)return true;
					$scope.data.model = model.path;
				return true;
			}	
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
.directive("sambaUserEdit", function($compile){
	return {
		scope: {
			user: "=ngModel"
		}, 
		templateUrl: "/widgets/samba-user-edit.html", 
		controller: "sambaUserEdit", 
		replace: true
	 };  
})
.controller("sambaUserEdit", function($scope){

}); 

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"New samba share":"Samba shares configuration","Name":"Rule Name","Path":"","Allow Guest Access":"","Read only?":"","General Settings":"","services.samba.info":"General samba settings.","samba.users.info":"Samba Users Configuration","Workgroup":"","Description":"","Share User Home Directory":"","Samba Shares Configuration":"","samba.shares.info":"Samba shares configuration","internet-services-samba-title":"Samba Configuration","menu-internet-services-samba-title":"Samba"});
	gettextCatalog.setStrings('fi', {"New samba share":"Uusi samba jako","Name":"Nimi","Path":"Polku","Allow Guest Access":"Salli vierasverkkopääsy","Read only?":"Vain luku?","Username":"Käyttäjänimi","Password":"Salasana","Description":"Kuvaus","General Settings":"Yleiset asetukset","services.samba.info":"Samba","Workgroup":"Työryhmäverkko","Share User Home Directory":"Jaa käyttäjän kotihakemisto","Samba Shares":"Samba verkkojaot","samba.shares.info":" ","Samba Users":"Samba Käyttäjät","samba.users.info":"Samba käyttäjät","internet-services-samba-title":"Samba","menu-internet-services-samba-title":"Samba"});
	gettextCatalog.setStrings('sv-SE', {"New samba share":"Ny samba share","Name":"Namn","Path":"Sökväg","Allow Guest Access":"Tillåt guest-åtkomst","Read only?":"Read only?","Username":"Användarnamn","Password":"Lösenord","Description":"Beskrivning","General Settings":"Generella Inställningar","services.samba.info":"Samba tillåter dig att dela din hårddisk med andra på nätverket. ","Workgroup":"Workgroup","Share User Home Directory":"Dela användarnas hemmamappar","Samba Shares":"Samba delning","samba.shares.info":"Konfigurera Samba-delning på den lokala nätverket. ","Samba Users":"Användare","samba.users.info":"Konfigurera användare för samba delning","internet-services-samba-title":"Samba","menu-internet-services-samba-title":"Samba"});
}]);

JUCI.style({"css":"\n\n\n"});
JUCI.template("widgets/samba-file-tree.html", "<div>\n<label translate>Select folder</label>\n<div style=\"max-height: 300px; overflow:auto;\">\n<abn-tree tree-data=\"data.tree\" on-select=\"on_select(branch)\" icon-leaf=\"fa fa-folder\">\n</abn-tree>\n</div>\n</div>\n");JUCI.template("widgets/samba-share-edit.html", "<div>\n<juci-config-lines>\n<juci-config-line title=\"{{'Name'|translate}}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"share.name.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Path'|translate}}\">\n<div class=\"input-group\">\n<span class=\"input-group-addon\">/mnt</span>\n<input type=\"text\" class=\"form-control\" ng-model=\"data.model\" \ntypeahead=\"address for address in onAutocomplete($viewValue)\" \ntypeahead-loading=\"loadingLocations\" \ntypeahead-no-results=\"noResults\" />\n<i ng-show=\"loadingLocations\" class=\"glyphicon glyphicon-refresh\"></i>\n<div ng-show=\"noResults\">\n  <i class=\"glyphicon glyphicon-remove\"></i> No Results Found\n</div>\n</div>\n<button class=\"btn btn-default pull-right\" style=\"margin:5px;\" ng-click=\"onAddFolder()\"><i class=\"fa fa-plus\"></i></button>\n</juci-config-line>\n<juci-config-line title=\"{{'Allowed users'|translate}}\">\n<dropdown-multi-select input-model=\"users.all\" output-model=\"users.out\" button-label=\"label\" item-label=\"label\"\non-open=\"reloadUsers()\" tick-property=\"selected\">\n</dropdown-multi-select>\n</juci-config-line>\n<juci-config-line title=\"{{'Allow Guest Access'|translate}}\">\n<switch ng-model=\"share.guest_ok.value\" class=\"green\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Read only?'|translate}}\">\n<switch ng-model=\"share.read_only.value\" class=\"green\"/>\n</juci-config-line>\n</juci-config-lines>\n</div>\n");JUCI.template("widgets/samba-user-edit.html", "<div>\n<juci-config-lines>\n<juci-config-line title=\"{{'Username'|translate}}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"user.user.value\" placeholder=\"{{'Username'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Password'|translate}}\">\n<input type=\"password\" class=\"form-control\" ng-model=\"user.password.value\" placeholder=\"{{'Password'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Description'|translate}}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"user.desc.value\" placeholder=\"{{'Description'|translate}}\"/>\n</juci-config-line>\n</juci-config-lines>\n</div>\n");JUCI.template("pages/internet-services-samba.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"ServiceSambaPage\">\n<juci-config-section title=\"{{'General Settings'|translate}}\">\n<juci-config-info>{{ 'services.samba.info' | translate }}</juci-config-info>\n<div ng-if=\"samba_not_installed\" class=\"alert alert-danger\" translate>Samba is not installed on this system</div>\n<juci-config-lines ng-if=\"!samba_not_installed\">\n<juci-config-line title=\"{{'Name'|translate}}\">\n<input type=\"text\" ng-model=\"config.name.value\" class=\"form-control\" placeholder=\"{{'Name'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Workgroup'|translate}}\">\n<input type=\"text\" ng-model=\"config.workgroup.value\" class=\"form-control\" placeholder=\"{{'Workgroup'|translate}}\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Description'|translate}}\">\n<input type=\"text\" ng-model=\"config.description.value\" class=\"form-control\" placeholder=\"{{'Description'|translate}}\"/>\n</juci-config-line>\n<!--<juci-config-line title=\"{{'Share User Home Directory'|translate}}\">\n<switch ng-model=\"config.homes.value\" class=\"green\"></switch>\n</juci-config-line>-->\n<juci-config-line title=\"{{'Interface'|translate}}\" help=\"{{'the interface(s) samba will listen on. Samba will not start if no interface is selected'|translate}}\">\n<dropdown-multi-select input-model=\"data.networks\" output-model=\"data.output\" button-label=\"label\" item-label=\"label\" tick-property=\"selected\"></dropdown-multi-select>\n</juci-config-line>\n</juci-config-lines>\n</juci-config-section>\n<juci-config-section title=\"{{'Samba Shares'|translate}}\" ng-if=\"!samba_not_installed\">\n<juci-config-info >{{'samba.shares.info'|translate}}</juci-config-info>\n<juci-list-editor ng-items=\"shares\" \nitem-editor=\"samba-share-edit\" \nget-item-title=\"getSambaShareTitle($item)\"\non-create=\"onCreateShare()\"\non-delete=\"onDeleteShare($item)\"></juci-list-editor>\n</juci-config-section>\n<juci-config-section title=\"{{'Samba Users'|translate}}\" ng-if=\"!samba_not_installed\">\n<juci-config-info >{{'samba.users.info'|translate}}</juci-config-info>\n<juci-list-editor ng-items=\"users\" \nitem-editor=\"samba-user-edit\" \nget-item-title=\"$item.user.value\"\non-create=\"onCreateUser()\"\non-delete=\"onDeleteUser($item)\"></juci-list-editor>\n</juci-config-section>\n</div>\n</juci-layout-with-sidebar>\n");