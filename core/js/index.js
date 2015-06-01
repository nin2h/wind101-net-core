switch (location.protocol) {
    case 'file:':
        var SERVER_ADDRESS = 'http://localhost:8099';
        var SERVER_SOCKET_ADDRESS = 'ws://localhost:8098';
        break;
    default:
        var SERVER_ADDRESS = location.origin;
        var SERVER_SOCKET_ADDRESS = 'ws://' + location.hostname + ':8098';
        break;
}

SERVER_ADDRESS = 'http://ponton:8099';
SERVER_SOCKET_ADDRESS = 'ws://ponton:8098';

jQuery(document).ready(function() {
    console.log('SERVER_ADDRESS is ' + SERVER_ADDRESS);
    console.log('SERVER_SOCKET_ADDRESS is ' + SERVER_SOCKET_ADDRESS);
    
    customer = new Customer();
    customer.init();
});
