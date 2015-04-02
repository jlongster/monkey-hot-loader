
# monkey-hot-loader

A [webpack](http://webpack.github.io/docs/) loader which adds live
updating functionality to a JavaScript system. View
[this post](http://jlongster.com/Backend-Apps-with-Webpack,-Part-III)
for gory technical details.

## Summary

This loader acts similarly to
[react-hot-loader](http://gaearon.github.io/react-hot-loader/) in that
it uses webpack's HMR infrastructure to be notified when a module has
changed. When it changes, it takes the new module's code and
monkey-patches the live running system automatically, so all you have
to do is **edit a file and save it**.

As described in
[my post](http://jlongster.com/Backend-Apps-with-Webpack,-Part-III),
currently this only supports updating top-level functions in a module.
That means given this code:

```js
function foo() {
  return 5;
}

function bar() {
  return function() { 
    // ...
  }
}

module.exports = function() {
  // ...
}
```

only `foo` and `bar` will update in the live system when changed.
Editing the function within `bar` will reload `bar` entirely; we have
no support for patching arbitrary functions like closures.

Turns out this is still incredibly valuable, and much easier to
rationalize about.

In the future, this could patch methods on classes as well which would
cover the majority of JavaScript code.

## Usage

See [the gulpfile](https://github.com/jlongster/backend-with-webpack/blob/master/gulpfile.js) in `backend-with-webpack` to see a full setup. This is a bit confusing right now. If you check out [backend-with-webpack](https://github.com/jlongster/backend-with-webpack), run `npm install` and `gulp run` you should have a full setup running.

1- Install the loader

```
npm install monkey-hot-loader
```

2- Add the loader to your webpack config, for example:

```js
  module: {
    loaders: [
      {test: /\.js$/, exclude: /node_modules/, loaders: ['monkey-hot', 'babel'] },
    ]
  }
```

3a- For the frontend, you need to run the [Webpack Dev Server](http://webpack.github.io/docs/webpack-dev-server.html) to serve your assets. It will create a socketio server that your frontend uses to receive notifications. You can see an example of using the API in react-hot-loader's [same code](https://github.com/gaearon/react-hot-boilerplate/blob/master/server.js) to fire up the server. Make sure to load your assets from this server (i.e. `http://localhost:3000/js/bundle.js`).

3b- In your webpack config, add 2 more files to load, which connect and listen to the dev server. Additionally, add the `HotModuleReplacementPlugin` to plugins.

Make sure that the adress & port of the webpack-dev-serve query points to the dev server instance.

```js
var frontendConfig = config({
  entry: [
    'webpack-dev-server/client?http://localhost:3000',
    'webpack/hot/only-dev-server',
    './static/js/main.js'
  ],
  output: {
    ...
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
});
```

4a- For the backend, do the same as the frontend except add only `webpack/hot/signal.js` file to your entry point. Also make sure to give a path to `recordsPath`.

```js
var backendConfig = config({
  entry: [
    'webpack/hot/signal.js',
    './src/main.js'
  ],
  target: 'node',
  output: {
    ...
  },
  recordsPath: path.join(__dirname, 'build/_records'),
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
});
```

The `signal.js` file instruments your app to check for updates when it receives a SIGURS2 signal. This is the same signal that nodemon uses to signal a restart, but `signal.js` overrides this behavior. Instead of restarting, your app will simply patch itself.

4b- For now, this setup requires nodemon, but in the future there could be multiple ways to talk to your running app. If you are using gulp, start your app with nodemon like this:

```js
nodemon({
  execMap: {
    js: 'node'
  },
  script: path.join(__dirname, 'build/backend'),
  ignore: ['*'],
  watch: ['nothing/'],
  ext: 'noop'
});
```

We tell `nodemon` to watch no files, since we don't care about that.

4c- Now, when webpack is done running, call `nodemon.restart()`. You will need to call webpack via that API. You should probably be doing all of this through gulp anyway.

```js
webpack(backendConfig).watch(100, function(err, stats) {
  nodemon.restart();
});
```

I know it's confusing, but remember, this restart just sends the signal which our app captures and actually just does an update.

I recommend just checking out [backend-with-webpack](https://github.com/jlongster/backend-with-webpack), installing with `npm install` and running with `gulp run` and playing with it there.
