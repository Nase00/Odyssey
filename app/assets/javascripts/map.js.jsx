$(function() {
  // Map options
  var mapStyle = [
    {"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#444444"}]},{"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":55}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#46bcec"},{"visibility":"on"}]}
  ];
  var mapOptions = {
    zoom: 12,
    panControl: false,
    tilt: 0,
    disableAutoPan: true,
    mapTypeControl: false,
    styles: mapStyle,
    zoomControl: false,
    center: new google.maps.LatLng(41.890033, -87.6500523)
  }
  var markerOptions = {
    icon: "assets/marker_green.png"
  }
  var rendererOptions = {
    map: map,
    markerOptions: markerOptions,
    suppressBicyclingLayer: true
  }

  // Initialize Map Dependencies
  var RoutesSegment = require('./components').model;
  var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);;
  var directionsService = new google.maps.DirectionsService();
  var map = new google.maps.Map(document.getElementById('map'), mapOptions);;
  directionsDisplay.setMap(map);

  RoutesSegment.prototype.drawRoute = function () {
    this.makeSafeWaypts();

    var request = {
        origin: this.waypts[0].location,
        destination: this.waypts[this.waypts.length - 1].location,
        waypoints: this.safeWaypts,
        travelMode: google.maps.TravelMode.BICYCLING
    };
    directionsService.route(request, function(response, status) {
      console.log(status)
      if (status == google.maps.DirectionsStatus.OK) {
        directionsDisplay.setDirections(response);
        React.render(<ErrorContainer data={[]} />, document.getElementById('error-container'));
        React.render(<RoutesInfoContainer data={routesSegment.wayptsInfo} />, document.getElementById('routes-display-container'));
      } else {
        React.render(<ErrorContainer data={[{message: "Waiting on Google", loadAnim: true}]} />, document.getElementById('error-container'));
      }
    });
  }

  function RouteControl() {
    this.getTrip = function() {
      routesSegment.offset += 1
      $.ajax({
        url: "trip_for/" + routesSegment.bikeId + "/after/" + routesSegment.offset,
        method: "get",
        dataType: "json",
        success: function(data) {
          if (data.length) {
            routesSegment.advanceRoute(data[0]);
          } else {
            React.render(<ErrorContainer data={[{message: "Bike not found, try another!", loadAnim: false}]} />, document.getElementById('error-container'));
          }
        }
      })
    };
    this.autoTraverseRoutes = function() {
      intervalId = setInterval(RouteControl.getTrip, 2800);
    };
    this.stopTraverse = function() {
      clearInterval(intervalId);
    };
  }

  // Initialize control dependencies
  var RouteControl = new RouteControl
  var routesSegment = new RoutesSegment
  var intervalId = null

  var InitializeMap = React.createClass({
    getInitialState: function() {
      return { mounted: false };
    },
    componentDidMount: function() {
      this.setState({ mounted: true });
    },
    startTraverse: function(e) {
      e.preventDefault();
      routesSegment.reset();
      React.render(<span />, document.getElementById('routes-display-container'))
      routesSegment.bikeId = document.getElementById('bike-id-input').value;
      routesSegment.offset = 0;
      RouteControl.getTrip();
      RouteControl.autoTraverseRoutes();
      React.render(<ControlMap />, document.getElementById('bike-control-container'))
    },
    startRandomTraverse: function(e) {
      e.preventDefault();
      routesSegment.reset();
      React.render(<span />, document.getElementById('routes-display-container'))
      routesSegment.bikeId = Math.floor(Math.random() * (3000-1) + 1);
      RouteControl.getTrip();
      RouteControl.autoTraverseRoutes();
      React.render(<ControlMap />, document.getElementById('bike-control-container'))
    },
    render: function() {
      var buttons =
        <div id="map-control-interface">
          <input id="bike-id-input" className="map-control text-field" type="text" autofocus="true" autoComplete="off" placeholder="Enter a bike ID" />
          <input id="start-traverse" className="map-control button-green" onClick={this.startTraverse} type="submit" target="remote" value="Begin" />
          <p className="click-through">- or -</p>
          <input id="start-traverse" className="map-control button-green" onClick={this.startRandomTraverse} type="submit" target="remote" value="Follow random bike" />
        </div>
      return (
        <div id="map-control-interface">
          <ReactCSSTransitionGroup transitionName="button">
            {buttons}
          </ReactCSSTransitionGroup>
        </div>
      );
    }
  })
  var ControlMap = React.createClass({
    getInitialState: function() {
      return {started: false};
    },
    stopTraverse: function() {
      RouteControl.stopTraverse();
      map.setZoom(12);
      React.render(<span />, document.getElementById('routes-display-container'))
      React.render(<ErrorContainer data={[]} />, document.getElementById('error-container'));
      React.render(<ReactCSSTransitionGroup transitionName="button"><InitializeMap /></ReactCSSTransitionGroup>, document.getElementById('bike-control-container'));
    },
    pauseTraverse: function() {
      clearInterval(intervalId);
      this.setState({started: !this.state.started});
      React.render(<ErrorContainer data={[]} />, document.getElementById('error-container'));
    },
    continueTraverse: function() {
      RouteControl.autoTraverseRoutes();
      this.setState({started: !this.state.started});
    },
    render: function() {
      var pause = this.state.started ? 
        <input id="continue-traverse" className="map-control button-green" onClick={this.continueTraverse} type="submit" target="remote" value="Continue" /> :
        <input id="pause-traverse" className="map-control button-blue" onClick={this.pauseTraverse} type="submit" target="remote" value="Pause" />
      return (
        <div id="map-control-interface">
          <input id="stop-traverse" className="map-control button-red" onClick={this.stopTraverse} type="submit" target="remote" value="Stop" />
          <ReactCSSTransitionGroup transitionName="button" component="div">
            {pause}
          </ReactCSSTransitionGroup>
        </div>
      );
    }
  })

  var RoutesInfoContainer = React.createClass({
    render: function() {
      var key = 0;
      var routeNodes = this.props.data.map(function (data) {
        return (
            <RouteInfoBox key={key++} data={data} />
          );
        if (key > 10) { key = 10 };
      }.bind(this));
      return (
        <div>
          <ReactCSSTransitionGroup transitionName="routeInfoBox" component="div">
            {routeNodes}
          </ReactCSSTransitionGroup>
        </div>
      );
    }
  })

  var RouteInfoBox = React.createClass({
    onClick: function() {
      console.log("test" + this.props.data.tripId)
    },
    render: function() {
      return (
        <div key={this.props.data.tripId} className="trip-box">
          <a href="#" onClick={this.onClick}>
            <p><b>Origin:</b> {this.props.data.startLocation}</p>
            <p className="indent">at {this.props.data.startTime}</p>
            <span className="extended-info">
              <p><b>Destination:</b> {this.props.data.stopLocation}</p> 
              <p className="indent">at {this.props.data.stopTime}</p>
              <p className="trip-id">Trip ID: {this.props.data.tripId}</p> 
            </span>        
          </a>
        </div>
      );
    }
  })

  var ErrorContainer = React.createClass({
    render: function() {
      var key = 0;
      var errors = this.props.data.map(function (error) {
      return (
          <ErrorMessage key={key++} data={error} />
        );
      });
      return (
        <div>
          <ReactCSSTransitionGroup transitionName="button">
            {errors}
          </ReactCSSTransitionGroup>
        </div>
      );
    }
  })
  var ErrorMessage = React.createClass({
    getInitialState: function() {
      return {dashFlash: " "};
    },
    flash: function() {
      if (this.state.dashFlash.length > 26) {
        this.setState({dashFlash: ""});
      } else {
        this.setState({dashFlash: this.state.dashFlash + "."});
      }
    },
    componentDidMount: function() {
      if (this.props.data.loadAnim) { this.interval = setInterval(this.flash, 100); }
    },
    componentWillUnmount: function() {
      clearInterval(this.interval);
    },
    render: function() {
      return (
        <div>{this.state.dashFlash} {this.props.data.message}</div>
      );
    }
  })

  React.render(<InitializeMap />, document.getElementById('bike-control-container'))
})