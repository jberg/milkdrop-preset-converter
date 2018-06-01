/*global __dirname, require, module*/

const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const path = require('path');
const env  = require('yargs').argv.env;

const webRoot = path.join(__dirname, '..', 'src/web');
const scriptRoot = path.join(__dirname, '..', 'src/script');
const sharedRoot = path.join(__dirname, '..', 'src/shared');
const nodeRoot = path.join(__dirname, '..', 'node_modules');
const outputPath = path.join(__dirname, '..', 'dist');

let outputFile = 'md-preset-converter';

if (env === 'prod') {
  outputFile += '.min';
}

let clientConfig = {
  entry: webRoot + '/index.js',
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
    modules: [webRoot, sharedRoot, nodeRoot],
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

    new UglifyJsPlugin({ parallel: true })
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
    modules: [scriptRoot, sharedRoot, nodeRoot],
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

    new UglifyJsPlugin({ parallel: true })
  );
}

module.exports = [clientConfig, scriptConfig];
