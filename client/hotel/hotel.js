angular.module( 'sample.hotel', [
  'auth0',
  'ui.bootstrap'
])
.controller( 'HotelListCtrl', function ( $scope, $http, auth, $http, $location, store, $rootScope, $state) {

  var hotels;

  var dateObj2Str = function(obj){
    var month = obj.getMonth()+1;
    if (month < 10) month = '0'+month;
    var day = obj.getDate();
    if (day < 10) day = '0'+day;
    var year = obj.getFullYear();
    return year + '-' + month + '-' + day;
  }

  $scope.search = function(){
    $http({
      method: 'GET',
      url: 'http://localhost:3001/hc?checkIn='+dateObj2Str($scope.booking.checkIn)+'&checkOut='+dateObj2Str($scope.booking.checkOut)+'&city='+$scope.booking.city.id
    }).then(function successCallback(response) {
      // this callback will be called asynchronously
      // when the response is available
      console.log(response)
      hotels = response.data.results;
      $scope.hotels = response.data.results;
    }, function errorCallback(response) {
      // called asynchronously if an error occurs
      // or server returns response with an error status.
      console.log(response)
    });
  }


  $scope.booking = {
    checkIn: new Date(2016,6,1),
    checkOut: new Date(2016, 6,3)
  };

  $scope.cities = [
    {
      name: "Toronto",
      id: 'Toronto'
    },
    {
      name: 'New York',
      id: 'New_York_City'
    },
    {
      name: 'San Francisco',
      id: 'San_Francisco'
    }
  ]

  $scope.citySelected = $scope.booking.city= {
    name: "Toronto",
    id: 'Toronto'
  }

  $scope.toggleStars = function(stars){
    $scope.hotels = _.filter(hotels, function (hotel) {
      return hotel.starRating === stars;
    })
  }


  $scope.selectCity = function(city){
    $scope.citySelected = city;
    $scope.booking.city = city;
  }

})
