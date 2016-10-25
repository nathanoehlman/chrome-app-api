module.exports = function(opts) {

	var commands = {
		installed: function(callback) {
			return callback();
		}
	};

	// Expose the external API listener
	chrome.runtime.onConnectExternal.addListener(function(port) {

		function error(msg, err) {
			port.postMessage({ responseTo: msg.id, ok: false, error: err });
		}

		function ok(msg, response) {
			port.postMessage({ responseTo: msg.id, ok: true, response: response || {}});
		}

		port.onMessage.addListener(function(msg) {
			// Not a valid request
			if (!msg || !msg.id) return;

			// Invalid command
			var command = commands[msg.command];
			if (!command) {
				return error(msg, 'Invalid command');
			}

			function responseHandler(err, response) {
				if (err) return error(msg, err);
				return ok(msg, response);
			}

			var args = JSON.parse(msg.args).concat(responseHandler);
			command.apply(port, args);
		});
	});

	return {
		// Registers a command
		register: function(command, fn) {
			if (!command || typeof fn !== 'function') throw new Error('Invalid command/function');
			if (commands[command]) throw new Error('Command already registered');
			commands[command] = fn;
		}
	};
};
