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
.directive("juciLayoutNaked", function(){
	return {
		templateUrl: "/widgets/juci-layout-naked.html", 
		transclude: true,
		controller: "juciLayoutNakedController",
		controllerAs: "ctrl"
	}; 
})
.controller("juciLayoutNakedController", function($scope){
	
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
	// 手机端 
	$scope.m_head ={
		navbar : false,
		left_navbar: ''
	}
  $scope.$on('to-parent', function(d,data) {  
		$scope.m_head = data
  }); 
	
}); 
