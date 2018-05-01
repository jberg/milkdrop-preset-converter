/*global __dirname, require, module*/

const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const path = require('path');
const env  = require('yargs').argv.env;

const srcRoot = path.join(__dirname, '..', 'src');
const scriptRoot = path.join(__dirname, '..', 'script');
const nodeRoot = path.join(__dirname, '..', 'node_modules');
const outputPath = path.join(__dirname, '..', 'dist');

let outputFile = 'md-preset-converter';

if (env === 'prod') {
  outputFile += '.min';
}

let clientConfig = {
  entry: srcRoot + '/index.js',
  devtool: 'source-map',
  target: 'web',
  output: {
    path: outputPath,
    filename: outputFile + '.js',
    library: 'mdPresetConverter',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /(\.js)$/,
        exclude: /node_modules|lib/,
        use: {
          loader: 'babel-loader?cacheDirectory',
          options: {
            plugins: ['transform-runtime'],
            presets: ['env']
          }
        }
      },
      {
        test: /(\.js)$/,
        exclude: /node_modules|lib/,
        use: {
          loader: 'eslint-loader'
        },
        enforce: 'pre'
      },
    ]
  },
  resolve: {
    modules: [srcRoot, nodeRoot],
    extensions: ['.js']
  },
  plugins: [],
  node: {
    fs: 'empty'
  }
};


if (env === 'prod') {
  clientConfig.plugins.push(
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),

    new UglifyJsPlugin()
  );
}


let scriptOutputFile = 'md-preset-converter-node';

if (env === 'prod') {
  scriptOutputFile += '.min';
}

let scriptConfig = {
  entry: scriptRoot + '/index.js',
  target: 'node',
  output: {
    path: outputPath,
    filename: scriptOutputFile + '.js'
  },
  module: {
    rules: [
      {
        test: /(\.js)$/,
        exclude: /node_modules|lib/,
        use: {
          loader: 'babel-loader?cacheDirectory',
          options: {
            plugins: ['transform-runtime'],
            presets: ['env']
          }
        }
      },
      {
        test: /(\.js)$/,
        exclude: /node_modules|lib/,
        use: {
          loader: 'eslint-loader'
        },
        enforce: 'pre'
      },
    ]
  },
  resolve: {
    modules: [scriptRoot, srcRoot, nodeRoot],
    extensions: ['.js']
  },
  plugins: []
};


if (env === 'prod') {
  scriptConfig.plugins.push(
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),

    new UglifyJsPlugin()
  );
}

module.exports = [clientConfig, scriptConfig];
