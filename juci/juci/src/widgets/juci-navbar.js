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
.directive("juciNavbar", function($location, $rootScope, $navigation){
	function activate(){
		var active_node = $navigation.findNodeByHref($location.path().replace(/\//g, "")); 
		if(!active_node) return; 
		var top_node = $navigation.findNodeByPath(active_node.path.split("/")[0]); 
		if(!top_node) return; 	
		setTimeout(function(){
			$("ul.navbar-nav li a").parent().removeClass("open"); 
			$("ul.navbar-nav li a[href='#!"+top_node.href+"']").addClass("open"); 
			$("ul.navbar-nav li a[href='#!"+top_node.href+"']").parent().addClass("open"); 
		}, 0); 
	}; 
	activate(); 
	$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
		activate(); 
	});
	return {
		restrict: 'E', 
		templateUrl: "/widgets/juci-navbar.html", 
		controller: "NavigationCtrl",
		replace: true
	}; 
})
.controller("NavigationCtrl", function($scope, $location, $navigation, $rootScope, $config, $rpc, $events){
	$scope.tree = $navigation.tree(); 
	$scope.log_events = []; 
	
	$scope.homepage = $config.settings.juci.homepage.value; 

	$scope.hasChildren = function(menu){
		return menu.children_list > 0; 
	}
	
	// 首页title 
	$scope.titleList = [{
		text: 'File Manager',
		href: ''
	},{
		text: 'Music Player',
		href: ''
	},{
		text: 'Connection',
		href: ''
	},{
		text: 'Web Terminal',
		href: ''
	},{
		text: 'Setting',
		href: ''
	}];
	
	$scope.isMore = false 
	$scope.showMore = function (){
		$scope.isMore = true
	}
	$scope.hideMore = function () {
		setTimeout(function(){
			$scope.isMore = false
		},1000);
	}

	// 手机端 
	$scope.m_head ={
		navbar : false,
		left_navbar: ''
	}
  // 显示导航
	$scope.mShow = function () {
		if(!$scope.m_head.navbar){
			$scope.m_head ={
				navbar : true,
				left_navbar: 'm_left_navbar'
			}
		} else {
			$scope.m_head ={
				navbar : false,
				left_navbar: 'm_left_navbar_out'
			}
		}
		$scope.$emit('to-parent', $scope.m_head);
		
	}


}); 
