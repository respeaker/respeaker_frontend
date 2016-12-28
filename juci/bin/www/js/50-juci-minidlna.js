
(function() {
  var module,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  module = angular.module('angularBootstrapNavTree', []);

  module.directive('abnTree', [
    '$timeout', function($timeout) {
      return {
        restrict: 'E',
        template: "<ul class=\"nav nav-list nav-pills nav-stacked abn-tree\">\n  <li ng-repeat=\"row in tree_rows | filter:{visible:true} track by row.branch.uid\" ng-animate=\"'abn-tree-animate'\" ng-class=\"'level-' + {{ row.level }} + (row.branch.selected ? ' active':'') + ' ' +row.classes.join(' ')\" class=\"abn-tree-row\"><a ng-click=\"user_clicks_branch(row.branch)\"><i ng-class=\"row.tree_icon\" ng-click=\"row.branch.expanded = !row.branch.expanded\" class=\"indented tree-icon\"> </i><span class=\"indented tree-label\">{{ row.label }} </span></a></li>\n</ul>",
        replace: true,
        scope: {
          treeData: '=',
          onSelect: '&',
          initialSelection: '@',
          treeControl: '='
        },
        link: function(scope, element, attrs) {
          var error, expand_all_parents, expand_level, for_all_ancestors, for_each_branch, get_parent, n, on_treeData_change, select_branch, selected_branch, tree;
          error = function(s) {
            console.log('ERROR:' + s);
            debugger;
            return void 0;
          };
          if (attrs.iconExpand == null) {
            attrs.iconExpand = 'icon-plus  glyphicon glyphicon-plus  fa fa-plus';
          }
          if (attrs.iconCollapse == null) {
            attrs.iconCollapse = 'icon-minus glyphicon glyphicon-minus fa fa-minus';
          }
          if (attrs.iconLeaf == null) {
            attrs.iconLeaf = 'icon-file  glyphicon glyphicon-file  fa fa-file';
          }
          if (attrs.expandLevel == null) {
            attrs.expandLevel = '3';
          }
          expand_level = parseInt(attrs.expandLevel, 10);
          if (!scope.treeData) {
            alert('no treeData defined for the tree!');
            return;
          }
          if (scope.treeData.length == null) {
            if (treeData.label != null) {
              scope.treeData = [treeData];
            } else {
              alert('treeData should be an array of root branches');
              return;
            }
          }
          for_each_branch = function(f) {
            var do_f, root_branch, _i, _len, _ref, _results;
            do_f = function(branch, level) {
              var child, _i, _len, _ref, _results;
              f(branch, level);
              if (branch.children != null) {
                _ref = branch.children;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  child = _ref[_i];
                  _results.push(do_f(child, level + 1));
                }
                return _results;
              }
            };
            _ref = scope.treeData;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              root_branch = _ref[_i];
              _results.push(do_f(root_branch, 1));
            }
            return _results;
          };
          selected_branch = null;
          select_branch = function(branch) {
            if (!branch) {
              if (selected_branch != null) {
                selected_branch.selected = false;
              }
              selected_branch = null;
              return;
            }
            if (branch !== selected_branch) {
              if (selected_branch != null) {
                selected_branch.selected = false;
              }
              branch.selected = true;
              selected_branch = branch;
              expand_all_parents(branch);
              if (branch.onSelect != null) {
                return $timeout(function() {
                  return branch.onSelect(branch);
                });
              } else {
                if (scope.onSelect != null) {
                  return $timeout(function() {
                    return scope.onSelect({
                      branch: branch
                    });
                  });
                }
              }
            }
          };
          scope.user_clicks_branch = function(branch) {
            if (branch !== selected_branch) {
              return select_branch(branch);
            }
          };
          get_parent = function(child) {
            var parent;
            parent = void 0;
            if (child.parent_uid) {
              for_each_branch(function(b) {
                if (b.uid === child.parent_uid) {
                  return parent = b;
                }
              });
            }
            return parent;
          };
          for_all_ancestors = function(child, fn) {
            var parent;
            parent = get_parent(child);
            if (parent != null) {
              fn(parent);
              return for_all_ancestors(parent, fn);
            }
          };
          expand_all_parents = function(child) {
            return for_all_ancestors(child, function(b) {
              return b.expanded = true;
            });
          };
          scope.tree_rows = [];
          on_treeData_change = function() {
            var add_branch_to_list, root_branch, _i, _len, _ref, _results;
            for_each_branch(function(b, level) {
              if (!b.uid) {
                return b.uid = "" + Math.random();
              }
            });
            console.log('UIDs are set.');
            for_each_branch(function(b) {
              var child, _i, _len, _ref, _results;
              if (angular.isArray(b.children)) {
                _ref = b.children;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  child = _ref[_i];
                  _results.push(child.parent_uid = b.uid);
                }
                return _results;
              }
            });
            scope.tree_rows = [];
            for_each_branch(function(branch) {
              var child, f;
              if (branch.children) {
                if (branch.children.length > 0) {
                  f = function(e) {
                    if (typeof e === 'string') {
                      return {
                        label: e,
                        children: []
                      };
                    } else {
                      return e;
                    }
                  };
                  return branch.children = (function() {
                    var _i, _len, _ref, _results;
                    _ref = branch.children;
                    _results = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                      child = _ref[_i];
                      _results.push(f(child));
                    }
                    return _results;
                  })();
                }
              } else {
                return branch.children = [];
              }
            });
            add_branch_to_list = function(level, branch, visible) {
              var child, child_visible, tree_icon, _i, _len, _ref, _results;
              if (branch.expanded == null) {
                branch.expanded = false;
              }
              if (branch.classes == null) {
                branch.classes = [];
              }
              if (!branch.noLeaf && (!branch.children || branch.children.length === 0)) {
                tree_icon = attrs.iconLeaf;
                if (__indexOf.call(branch.classes, "leaf") < 0) {
                  branch.classes.push("leaf");
                }
              } else {
                if (branch.expanded) {
                  tree_icon = attrs.iconCollapse;
                } else {
                  tree_icon = attrs.iconExpand;
                }
              }
              scope.tree_rows.push({
                level: level,
                branch: branch,
                label: branch.label,
                classes: branch.classes,
                tree_icon: tree_icon,
                visible: visible
              });
              if (branch.children != null) {
                _ref = branch.children;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  child = _ref[_i];
                  child_visible = visible && branch.expanded;
                  _results.push(add_branch_to_list(level + 1, child, child_visible));
                }
                return _results;
              }
            };
            _ref = scope.treeData;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              root_branch = _ref[_i];
              _results.push(add_branch_to_list(1, root_branch, true));
            }
            return _results;
          };
          scope.$watch('treeData', on_treeData_change, true);
          if (attrs.initialSelection != null) {
            for_each_branch(function(b) {
              if (b.label === attrs.initialSelection) {
                return $timeout(function() {
                  return select_branch(b);
                });
              }
            });
          }
          n = scope.treeData.length;
          console.log('num root branches = ' + n);
          for_each_branch(function(b, level) {
            b.level = level;
            return b.expanded = b.level < expand_level;
          });
          if (scope.treeControl != null) {
            if (angular.isObject(scope.treeControl)) {
              tree = scope.treeControl;
              tree.expand_all = function() {
                return for_each_branch(function(b, level) {
                  return b.expanded = true;
                });
              };
              tree.collapse_all = function() {
                return for_each_branch(function(b, level) {
                  return b.expanded = false;
                });
              };
              tree.get_first_branch = function() {
                n = scope.treeData.length;
                if (n > 0) {
                  return scope.treeData[0];
                }
              };
              tree.select_first_branch = function() {
                var b;
                b = tree.get_first_branch();
                return tree.select_branch(b);
              };
              tree.get_selected_branch = function() {
                return selected_branch;
              };
              tree.get_parent_branch = function(b) {
                return get_parent(b);
              };
              tree.select_branch = function(b) {
                select_branch(b);
                return b;
              };
              tree.get_children = function(b) {
                return b.children;
              };
              tree.select_parent_branch = function(b) {
                var p;
                if (b == null) {
                  b = tree.get_selected_branch();
                }
                if (b != null) {
                  p = tree.get_parent_branch(b);
                  if (p != null) {
                    tree.select_branch(p);
                    return p;
                  }
                }
              };
              tree.add_branch = function(parent, new_branch) {
                if (parent != null) {
                  parent.children.push(new_branch);
                  parent.expanded = true;
                } else {
                  scope.treeData.push(new_branch);
                }
                return new_branch;
              };
              tree.add_root_branch = function(new_branch) {
                tree.add_branch(null, new_branch);
                return new_branch;
              };
              tree.expand_branch = function(b) {
                if (b == null) {
                  b = tree.get_selected_branch();
                }
                if (b != null) {
                  b.expanded = true;
                  return b;
                }
              };
              tree.collapse_branch = function(b) {
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  b.expanded = false;
                  return b;
                }
              };
              tree.get_siblings = function(b) {
                var p, siblings;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  p = tree.get_parent_branch(b);
                  if (p) {
                    siblings = p.children;
                  } else {
                    siblings = scope.treeData;
                  }
                  return siblings;
                }
              };
              tree.get_next_sibling = function(b) {
                var i, siblings;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  siblings = tree.get_siblings(b);
                  n = siblings.length;
                  i = siblings.indexOf(b);
                  if (i < n) {
                    return siblings[i + 1];
                  }
                }
              };
              tree.get_prev_sibling = function(b) {
                var i, siblings;
                if (b == null) {
                  b = selected_branch;
                }
                siblings = tree.get_siblings(b);
                n = siblings.length;
                i = siblings.indexOf(b);
                if (i > 0) {
                  return siblings[i - 1];
                }
              };
              tree.select_next_sibling = function(b) {
                var next;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  next = tree.get_next_sibling(b);
                  if (next != null) {
                    return tree.select_branch(next);
                  }
                }
              };
              tree.select_prev_sibling = function(b) {
                var prev;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  prev = tree.get_prev_sibling(b);
                  if (prev != null) {
                    return tree.select_branch(prev);
                  }
                }
              };
              tree.get_first_child = function(b) {
                var _ref;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  if (((_ref = b.children) != null ? _ref.length : void 0) > 0) {
                    return b.children[0];
                  }
                }
              };
              tree.get_closest_ancestor_next_sibling = function(b) {
                var next, parent;
                next = tree.get_next_sibling(b);
                if (next != null) {
                  return next;
                } else {
                  parent = tree.get_parent_branch(b);
                  return tree.get_closest_ancestor_next_sibling(parent);
                }
              };
              tree.get_next_branch = function(b) {
                var next;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  next = tree.get_first_child(b);
                  if (next != null) {
                    return next;
                  } else {
                    next = tree.get_closest_ancestor_next_sibling(b);
                    return next;
                  }
                }
              };
              tree.select_next_branch = function(b) {
                var next;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  next = tree.get_next_branch(b);
                  if (next != null) {
                    tree.select_branch(next);
                    return next;
                  }
                }
              };
              tree.last_descendant = function(b) {
                var last_child;
                if (b == null) {
                  debugger;
                }
                n = b.children.length;
                if (n === 0) {
                  return b;
                } else {
                  last_child = b.children[n - 1];
                  return tree.last_descendant(last_child);
                }
              };
              tree.get_prev_branch = function(b) {
                var parent, prev_sibling;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  prev_sibling = tree.get_prev_sibling(b);
                  if (prev_sibling != null) {
                    return tree.last_descendant(prev_sibling);
                  } else {
                    parent = tree.get_parent_branch(b);
                    return parent;
                  }
                }
              };
              return tree.select_prev_branch = function(b) {
                var prev;
                if (b == null) {
                  b = selected_branch;
                }
                if (b != null) {
                  prev = tree.get_prev_branch(b);
                  if (prev != null) {
                    tree.select_branch(prev);
                    return prev;
                  }
                }
              };
            }
          }
        }
      };
    }
  ]);

}).call(this);

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

JUCI.app.requires.push("angularBootstrapNavTree"); 
JUCI.app.requires.push("dropdown-multi-select");

JUCI.app
.factory("$minidlna", function($uci){
	function MiniDLNA(){
		
	}
	
	MiniDLNA.prototype.getConfig = function(){
		var deferred = $.Deferred(); 
		$uci.$sync("minidlna").done(function(){
			if(!$uci.minidlna.config) deferred.reject(); 
			else deferred.resolve($uci.minidlna.config); 
		}); 
		return deferred.promise(); 
	}
	return new MiniDLNA(); 
}); 


UCI.$registerConfig("minidlna");
UCI.minidlna.$registerSectionType("minidlna", {
	"enabled":          { dvalue: 0, type: Number },
	"port":         	{ dvalue: "", type: Number },
	"interface":        { dvalue: "", type: String },
	"friendly_name":    { dvalue: "", type: String },
	"db_dir":         	{ dvalue: "/var/run/minidlna", type: String },
	"log_dir":         	{ dvalue: "/var/log", type: String },
	"inotify":         	{ dvalue: false, type: Boolean },
	"enable_tivo":      { dvalue: true, type: Boolean },
	"strict_dlna":      { dvalue: false, type: Boolean },
	"presentation_url": { dvalue: "", type: String },
	"notify_interval":  { dvalue: 900, type: Number },
	"serial":         	{ dvalue: "12345678", type: String },
	"model_number":		{ dvalue: "1", type: String },
	"root_container":	{ dvalue: "", type: String },
	"media_dir":		{ dvalue: [], type: Array },
	"album_art_names":	{ dvalue: "", type: String },
	"network":			{ dvalue: "lan", type: String },
	"minissdpsocket":	{ dvalue: "", type: String }
});
			

//! Author: Reidar Cederqvist <reidar.cederqvist@gmail.com>

JUCI.app
.controller("MiniDLNAConfigPage", function($network, $scope, $minidlna, $tr, gettext, $rpc, $juciDialog){
	$scope.data = [{label:"loading"}];
	$scope.network = {
		all : [],
		selected : []
	};
	$scope.port = {};
	$scope.album_art = []
	$minidlna.getConfig().done(function(config){
		$scope.config = config; 
		$scope.album_art = $scope.config.album_art_names.value.split("/");
		$scope.tagslistData = $scope.config.media_dir.value.filter(function(dir){
			var pre = dir.substr(0, 2);
			var dirr;
			if(pre == "A," || pre == "V," || pre == "P,"){
				dirr = dir.substr(2);
			}else{
				dirr = dir;
			}
			return (dirr.substring(0, 4) == "/mnt");
		}).map(function(dir){
			if(dir == "/mnt/"){
				return {
					text: "/",
					path: dir
				}
			}else if(dir.substr(2) == "/mnt/"){
				return {
					text: dir.substr(0, 2) + "/",
					path: dir
				}
			}
			if(dir.substr(1, 1) == ","){
				return {
					text: "/" + dir.substr(0,2) + dir.substring(4),
					path: dir
				}
			}
			return {
				text: "/" + dir.substr(4),
				path: dir
			}
		
		});
		$network.getNetworks().done(function(data){
			$scope.network.all = data.map(function(x){
				return {
					name:x[".name"],
					selected: ($scope.config.network.value.split(",").indexOf(x[".name"]) > -1)
				}
			});
			$scope.$apply();
		});
	});

	$rpc.juci.minidlna.status().done(function(data){
		$scope.count = data.count;
		$scope.$apply();
	});
	
	$rpc.juci.system.service.status({name:"minidlna"}).done(function(result){
		$scope.is_running = result.running;
		$scope.$apply();
	});

	$scope.root_dir = [
		{ label: $tr(gettext("Standard Container")),	value: "." },
		{ label: $tr(gettext("Browse directory")), 		value: "B" },
		{ label: $tr(gettext("Music")),					value: "M" },
		{ label: $tr(gettext("Video")),					value: "V" },
		{ label: $tr(gettext("Pictures")),				value: "P" }
	];
	$scope.$watch('port', function onMinidlnaPortChanged(){
		if(!$scope.port || !$scope.port.value)return;
		$scope.config.port.value = $scope.port.value;
	}, true);
	$scope.onChangeAAName = function(tag){
		var index = null;
		if((index = $scope.album_art.indexOf(tag.text)) > -1){
			$scope.album_art.splice(index,1);
		}else{
			$scope.album_art.push(tag.text);
		}
		$scope.config.album_art_names.value = $scope.album_art.join("/");
	};
	$scope.$watch("network.selected", function onNetworkSelectedChanged(){
		if(!$scope.config)return;
		$scope.config.network.value = $scope.network.selected.map(function(x){
			return x.name;
		}).join();
	}, true);
	$scope.onAddFolder = function(){
		var model = {}
		$juciDialog.show("minidlna-file-tree", {
			title: $tr(gettext("Add folder to share")),
			model: model,
			on_apply: function(btn, dlg){
				if(!model.selected || !model.selected.path)return false;
				for(var i=0; i < $scope.tagslistData.length; i++){
					var prefix = $scope.tagslistData[i].path.substr(0,2);
					if(prefix  == "V," || prefix == "A," || prefix == "P,")
						if($scope.tagslistData[i].path.substr(2) == model.selected.path) return false;
					if($scope.tagslistData[i].path == model.selected.path) return false;
				}
				if(model.selected_dirtype != ""){
					$scope.tagslistData.push({
						path: model.selected_dirtype + "," + model.selected.path,
						text: model.selected_dirtype + "," + model.selected.path.substr(4)
					});
				}else{
					$scope.tagslistData.push({
						path: model.selected.path,
						text: model.selected.path.substr(4)
					});
				}
				$scope.updateConfig();
				return true;
			}	
		});
	};
	$scope.onTagAdded = function(tag){
		$scope.tagslistData = $scope.tagslistData.map(function(k){
			if(k.text == tag.text){
				k.path = "/mnt"+k.text;
			}
			return k;
		});
		$scope.updateConfig();
	};
	$scope.updateConfig =  function(){
		$scope.config.media_dir.value = $scope.tagslistData.map(function(dir){
			return dir.path;
		});
	};
	var tag_promise = null;
	$scope.loadTags = function(text){
		if(!tag_promise) tag_promise = new Promise(function(resolve, reject){
			$rpc.juci.minidlna.autocomplete({path:text}).done(function(data){
				tag_promise = null;
				if(data.folders) resolve(data.folders);
				else reject(data);
			})
		});
		return tag_promise;
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
.directive("minidlnaFileTree", function(){
	return {
		templateUrl: "/widgets/minidlna-file-tree.html",
		scope: {
			model: "=ngModel"	
		},
		require: "^ngModel",
		controller: "minidlnaFileTreeController"
	};
}).controller("minidlnaFileTreeController", function($scope, $rpc, $tr, gettext){
	$scope.data = {
			tree: [{
			label: $tr(gettext("Loading.."))
		}], 
		dirtypes: [ 
			{ label: $tr(gettext("All types")), value:"" }, 
			{ label: $tr(gettext("Video only")), value:"V" },
			{ label: $tr(gettext("Audio only")), value:"A" },
			{ label: $tr(gettext("Pictures only")), value:"P" }
		]
	}; 
	$scope.model.selected_dirtype = $scope.data.dirtypes[0].value;
	$scope.on_select = function(branch){
		$scope.model.selected = branch; 
	}
	$rpc.juci.minidlna.folder_tree().done(function(data){
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
		$scope.model.selected = {};
		$scope.$apply();
	});
});

angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
	gettextCatalog.setStrings('en', {"Add folder to share":"","Loading..":"","All types":"","Video only":"","Audio only":"","Pictures only":"","Media type":"","Select folder":"","Enable":"","Port":"Port","Interfaces":"Interfaces","Friendly Name":"","Root Container":"","Media Directories":"","Album-Art Names":"","MiniDLNA Settings":"MiniDLNA Settings","minidlna.settings.info":"MiniDLNA allows you to share your media from a hard drive connected to your router.","internet-services-minidlna-title":"MiniDLNA","menu-internet-services-minidlna-title":"MiniDLNA"});
	gettextCatalog.setStrings('fi', {"Add folder to share":"Lisää jaettava kansio","Loading..":"Lataan...","All types":"Kaikki tyypit","Video only":"Vain video","Audio only":"Vain ääni","Pictures only":"Vain kuvia","Media type":"Mediatyyppi","Select folder":"Valitse kansio","Enable":"Ota käyttöön","Port":"Portti","Network":"Verkko","Friendly Name":"Nimi","Root Container":"Juurikansio","Media Directories":"Media Hakemistot","Album-Art Names":"Albumin Kansikuvanimet","write list of album-art names":"Albumin Kansikuvanimet","MiniDLNA Settings":"MiniDLNA Asetukset","minidlna.settings.info":"MiniDLNA mahdollistaa musiikin, videoiden, valokuvien ja tiedostojen jakamisen reitittimeen kytketyltä USB-kiintolevyltä.","internet-services-minidlna-title":"MiniDLNA","menu-internet-services-minidlna-title":"MiniDLNA"});
	gettextCatalog.setStrings('sv-SE', {"Add folder to share":"Lägg till mapp som du vill dela","Loading..":"Laddar...","All types":"Alla typer","Video only":"Endast videofilmer","Audio only":"Endast ljudfiler","Pictures only":"Endast bilder","Media type":"Media typer","Select folder":"Välj mapp","Enable":"Aktivera","Port":"Port","Network":"Nätverk","Friendly Name":"Friendly Namn","Root Container":"Root-behållare","Media Directories":"Mediamappar","Album-Art Names":"Album-Art Namn","write list of album-art names":"Skriv in lista av album-art filnamn","MiniDLNA Settings":"MiniDLNA inställnignar","minidlna.settings.info":"Inställningar för MiniDLNA","internet-services-minidlna-title":"MiniDLNA","menu-internet-services-minidlna-title":"MiniDLNA"});
}]);

JUCI.style({"css":"\n/* \n   abn-tree.css\n\n   style for the angular-bootstrap-nav-tree\n   for both Bootstrap 2 and Bootstrap 3\n\n*/\n\n\n\n/* ------------------------------------------\nAngularJS Animations...\n\nThe first selector is for Angular 1.1.5\nThe second selector is for Angular 1.2.0\n\n*/\n.abn-tree-animate-enter,\nli.abn-tree-row.ng-enter {\n  transition: 200ms linear all;\n  position: relative;\n  display: block;\n  opacity: 0;\n  max-height:0px;\n}\n.abn-tree-animate-enter.abn-tree-animate-enter-active,\nli.abn-tree-row.ng-enter-active{\n  opacity: 1;\n  max-height:30px;\n}\n\n.abn-tree-animate-leave,\nli.abn-tree-row.ng-leave {\n  transition: 200ms linear all;\n  position: relative;\n  display: block;\n  height:30px;\n  max-height: 30px;\n  opacity: 1;\n}\n.abn-tree-animate-leave.abn-tree-animate-leave-active,\nli.abn-tree-row.ng-leave-active {  \n  height: 0px;\n  max-height:0px;\n  opacity: 0;\n}\n\n\n/* \n------------------------------------------\nAngular 1.2.0 Animation \n*/\n\n\n.abn-tree-animate.ng-enter{\n\n}\n.abn-tree-animate.ng-enter{\n\n}\n\n\n\n\n/*\n   end animation stuff\n-----------------------------------------\n   begin normal css stuff\n*/\nul.abn-tree li.abn-tree-row {  \n  padding: 0px;\n  margin:0px;\n}\n\nul.abn-tree li.abn-tree-row a {\n  padding: 3px 10px;\n}\n\nul.abn-tree i.indented {\n  padding: 2px;\n}\n\n.abn-tree {\n  cursor: pointer;\n}\nul.nav.abn-tree .level-1 .indented {\n  position: relative;\n  left: 0px;\n}\nul.nav.abn-tree .level-2 .indented {\n  position: relative;\n  left: 20px;\n}\nul.nav.abn-tree .level-3 .indented {\n  position: relative;\n  left: 40px;\n}\nul.nav.abn-tree .level-4 .indented {\n  position: relative;\n  left: 60px;\n}\nul.nav.abn-tree .level-5 .indented {\n  position: relative;\n  left: 80px;\n}\nul.nav.abn-tree .level-6 .indented {\n  position: relative;\n  left: 100px;\n}\nul.nav.nav-list.abn-tree .level-7 .indented {\n  position: relative;\n  left: 120px;\n}\nul.nav.nav-list.abn-tree .level-8 .indented {\n  position: relative;\n  left: 140px;\n}\nul.nav.nav-list.abn-tree .level-9 .indented {\n  position: relative;\n  left: 160px;\n}\n\n\n\n"});
JUCI.template("widgets/minidlna-file-tree.html", "<div>\n<label translate>Select folder</label>\n<div style=\"max-height: 300px; overflow:auto;\">\n<abn-tree tree-data=\"data.tree\" on-select=\"on_select(branch)\" icon-leaf=\"fa fa-folder\">\n</abn-tree>\n</div>\n<juci-config-lines>\n<juci-config-line title=\"{{'Media type' | translate}}\">\n<juci-select ng-items=\"data.dirtypes\" ng-model=\"model.selected_dirtype\" ></juci-select>\n</juci-config-line>\n</juci-config-lines>\n</div>\n");JUCI.template("pages/internet-services-minidlna.html", "<juci-layout-with-sidebar>\n<div ng-controller=\"MiniDLNAConfigPage\">\n<h2 translate>MiniDLNA</h2>\n<p translate>MiniDLNA is server software with the aim of being fully compliant with DLNA/UPnP-AV clients.</p>\n<juci-config-lines>\n<juci-config-line title=\"{{'Enable'|translate}}\">\n<switch ng-model=\"config.enabled.value\" class=\"green\"/>\n</juci-config-line>\n</juci-config-lines>\n<div class=\"alert alert-danger\" ng-if=\"!is_running\" translate>The miniDLNA service is not running!</div>\n<div class=\"alert alert-info\" ng-if=\"is_running\" translate>The miniDLNA service is running, serving {{ count.audio }} audio, \n{{ count.video}} video and {{ count.image }} image files.</div>\n<accordion close-others=\"true\" ng-show=\"config.enabled.value\">\n<accordion-group heading=\"{{ 'General Settings' | translate }}\" is-open=true >\n<juci-config-lines>\n<juci-config-line title=\"{{'Port'|translate}}\" help=\"{{ 'Port for HTTP (descriptions, SOAP, media transfer) traffic.' | translate }}\">\n<input type=\"number\" class=\"form-control\" min=\"0\" max=\"65535\" ng-model=\"port.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Network'|translate}}\" help=\"{{ 'Network interfaces to serve.' | translate }}\">\n<dropdown-multi-select input-model=\"network.all\" output-model=\"network.selected\" \nbutton-label=\"name\" item-label=\"name\" tick-property=\"selected\"></dropdown-multi-select>\n</juci-config-line>\n<juci-config-line title=\"{{'Friendly Name'|translate}}\" help=\"{{ 'Set this if you want to customize the name that shows up on your clients.' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"config.friendly_name.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{'Root Container'|translate}}\">\n<juci-select ng-items=\"root_dir\" ng-model=\"config.root_container.value\"></juci-select>\n</juci-config-line>\n<juci-config-line title=\"{{'Media Directories'|translate}}\" no-pull>\n<div class=\"input-group\">\n<span class=\"input-group-addon\">/mnt</span>\n<tags-input ng-model=\"tagslistData\" display-property=\"text\"\non-tag-added=\"onTagAdded($tag)\" on-tag-removed=\"updateConfig()\"\nadd-from-autocomplete-only=\"true\" min-length=\"0\">\n<auto-complete source=\"loadTags($query)\" min-length=\"0\"></auto-complete>\n</tags-input>\n</div><br/>\n<button class=\"btn btn-default pull-right\" ng-click=\"onAddFolder()\"><i class=\"fa fa-plus\"></i></button>\n</juci-config-line>\n<juci-config-line title=\"{{'Album-Art Names'|translate}}\" help=\"{{ 'This is a list of file names to check for when searching for album art.' | translate }}\">\n<tags-input ng-model=\"album_art\" display-property=\"text\" min-length=\"5\"\nadd-on-space=\"true\" add-on-blur=\"false\" on-tag-added=\"onChangeAAName($tag)\"\non-tag-removed=\"onChangeAAName($tag)\" placeholder=\"{{'write list of album-art names' | translate}}\">\n</tags-input>\n</juci-config-line>\n</juci-config-lines>\n</accordion-group>\n<accordion-group heading=\"{{ 'Advanced settings' | translate }}\">\n<juci-config-lines>\n<juci-config-line title=\"{{ 'Database directory' | translate }}\" help=\"{{ 'Set this if you would like to specify the directory where you want \nMiniDLNA to storeits database and album art cache.' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"config.db_dir.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Log directory' | translate }}\" help=\"{{ 'Set this if you would like to specify the directory where you want MiniDLNA \nto store its log file.' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"config.log_dir.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Enable inotify' | translate }}\"help=\"{{ 'Set this to enable inotify monitoring to automatically discover new files.' | translate }}\">\n<switch class=\"green\" ng-model=\"config.inotify.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Enable TIVO' | translate }}\" help=\"{{ 'Set this to enable support for streaming .jpg and .mp3 files to a TiVo supporting HMO.' | translate }}\">\n<switch class=\"green\" ng-model=\"config.enable_tivo.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Strict to DLNA standard' | translate }}\" help=\"{{ 'Set this to strictly adhere to DLNA standards. This will allow \nserver-side downscaling of very large JPEG images, which may hurt JPEG serving performance on (at least) Sony DLNA products.' | translate }}\">\n<switch class=\"green\" ng-model=\"config.strict_dlna.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Presentation URL' | translate }}\">\n<input type=\"text\" class=\"form-control\" placeholder=\"http://192.168.1.1/\" ng-model=\"config.presentation_url.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Notify interval' | translate }}\" help=\"{{ 'Notify interval in seconds.' | translate }}\">\n<input type=\"number\" class=\"form-control\" ng-model=\"config.notify_interval.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Announced serial number' | translate }}\" info=\"{{ 'Serial number the miniDLNA daemon will report to clients in its XML description.' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"config.serial.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'Announced model number' | translate }}\" help=\"{{ 'Model number the miniDLNA daemon will report to clients in its XML description.' | translate }}\">\n<input type=\"text\" class=\"form-control\" ng-model=\"config.model_number.value\"/>\n</juci-config-line>\n<juci-config-line title=\"{{ 'miniSSDP socket' | translate }}\" help=\"{{ 'Specify the path to the MiniSSDPd socket.' | translate }}\">\n<input type=\"text\" class=\"form-control\" placeholder=\"/var/run/minissdpd.sock\" ng-model=\"config.minissdpsocket.value\"/>\n</juci-config-line>\n</juci-config-lines>\n</accordion-group>\n</accordion>\n</div>\n</juci-layout-with-sidebar>\n");