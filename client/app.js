angular.module( 'sample', [
  'auth0',
  'ngRoute',
  'sample.home',
  'angular-storage',
  'angular-jwt',
  'ui.router',
  'sample.hotel'
])
.config( function myAppConfig ( $stateProvider, $urlRouterProvider, authProvider, $httpProvider, $locationProvider,
  jwtInterceptorProvider) {
    $urlRouterProvider.otherwise('/login');

    $stateProvider
    .state('logout', { url: '/logout', templateUrl: 'login/logout.html', controller: 'LogoutCtrl' })
    .state('login', { url: '/login', templateUrl: 'login/login.html', controller: 'LoginCtrl' })
    .state('home', { url: '/', templateUrl: 'home/home.html', controller: 'HomeCtrl', data: { requiresLogin: true } })
    .state('todos',
    {
      url: '/todos',
      templateUrl: 'todo/todos.html',
      controller: 'TodoListCtrl'
    })
    .state('todos_detail', {
      url: "/todos/:todoId",
      templateUrl: 'todo/todos.detail.html',
      controller: 'TodoDetailCtrl'
    })
    .state('hotels',
    {
      url: '/hotels',
      templateUrl: 'hotel/hotels.html',
      controller: 'HotelListCtrl'
    })

    authProvider.init({
      domain: AUTH0_DOMAIN,
      clientID: AUTH0_CLIENT_ID,
      // loginUrl: '/login'
      loginState: 'login' // matches login state
    });

    authProvider.on('loginSuccess', function($location, profilePromise, idToken, store) {
      console.log("Login Success");
      profilePromise.then(function(profile) {
        store.set('profile', profile);
        store.set('token', idToken);
      });
      $location.path('/');
    });

    authProvider.on('loginFailure', function() {
      alert("Error");
      $location.path('/login');
    });

    authProvider.on('authenticated', function($location) {
      console.log("Authenticated");

    });

    jwtInterceptorProvider.tokenGetter = function(store) {
      return store.get('token');
    };

    // Add a simple interceptor that will fetch all requests and add the jwt token to its authorization header.
    // NOTE: in case you are calling APIs which expect a token signed with a different secret, you might
    // want to check the delegation-token example
    $httpProvider.interceptors.push('jwtInterceptor');
  }).run(function($rootScope, auth, store, jwtHelper, $location) {
    $rootScope.$on('$locationChangeStart', function() {

      var token = store.get('token');
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          if (!auth.isAuthenticated) {
            auth.authenticate(store.get('profile'), token);
          }
        } else {
          // Either show the login page or use the refresh token to get a new idToken
          $location.path('/');
        }
      }

    });
  })
  .controller( 'AppCtrl', function AppCtrl ( $scope, $location ) {
    $scope.$on('$routeChangeSuccess', function(e, nextRoute){
      if ( nextRoute.$$route && angular.isDefined( nextRoute.$$route.pageTitle ) ) {
        $scope.pageTitle = nextRoute.$$route.pageTitle + ' | Auth0 Sample' ;
      }
    });
  });
