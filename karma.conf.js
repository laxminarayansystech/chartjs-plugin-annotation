const istanbul = require('rollup-plugin-istanbul');
const json = require('@rollup/plugin-json');
const resolve = require('@rollup/plugin-node-resolve').default;
const builds = require('./rollup.config');
const yargs = require('yargs');
const env = process.env.NODE_ENV;

module.exports = function(karma) {
  const args = yargs
    .option('verbose', {default: false})
    .argv;

  // Use the same rollup config as our dist files: when debugging (npm run dev),
  // we will prefer the unminified build which is easier to browse and works
  // better with source mapping. In other cases, pick the minified build to
  // make sure that the minification process (terser) doesn't break anything.
  const regex = karma.autoWatch ? /chartjs-plugin-annotation\.js$/ : /chartjs-plugin-annotation\.min\.js$/;
  const build = builds.filter(v => v.output.file && v.output.file.match(regex))[0];

  if (env === 'test') {
    build.plugins = [
      json(),
      resolve(),
      istanbul({exclude: ['node_modules/**/*.js', 'package.json']})
    ];
  }

  karma.set({
    frameworks: ['jasmine'],
    reporters: ['progress', 'kjhtml'],
    browsers: (args.browsers || 'chrome,firefox').split(','),
    logLevel: karma.LOG_INFO,

    client: {
      jasmine: {
        failFast: !!karma.autoWatch
      }
    },

    // Explicitly disable hardware acceleration to make image
    // diff more stable when ran on Travis and dev machine.
    // https://github.com/chartjs/Chart.js/pull/5629
    customLaunchers: {
      chrome: {
        base: 'Chrome',
        flags: [
          '--disable-accelerated-2d-canvas'
        ]
      },
      firefox: {
        base: 'Firefox',
        prefs: {
          'layers.acceleration.disabled': true
        }
      }
    },

    files: [
      {pattern: 'test/fixtures/**/*.js', included: false},
      {pattern: 'test/fixtures/**/*.png', included: false},
      {pattern: 'node_modules/chart.js/dist/chart.js'},
      {pattern: 'src/index.js', watched: false},
      {pattern: 'test/index.js'},
      {pattern: 'test/specs/**/**.js'}
    ],

    preprocessors: {
      'src/index.js': ['sources'],
      'test/index.js': ['rollup']
    },

    rollupPreprocessor: {
      plugins: [
        resolve(),
      ],
      output: {
        name: 'test',
        format: 'umd',
        sourcemap: karma.autoWatch ? 'inline' : false
      }
    },

    customPreprocessors: {
      sources: {
        base: 'rollup',
        options: build
      }
    },

    // These settings deal with browser disconnects. We had seen test flakiness from Firefox
    // [Firefox 56.0.0 (Linux 0.0.0)]: Disconnected (1 times), because no message in 10000 ms.
    // https://github.com/jasmine/jasmine/issues/1327#issuecomment-332939551
    browserDisconnectTolerance: 3
  });

  if (env === 'test') {
    karma.reporters.push('coverage');
    karma.coverageReporter = {
      dir: 'coverage/',
      reporters: [
        {type: 'html', subdir: 'html'},
        {type: 'lcovonly', subdir: (browser) => browser.toLowerCase().split(/[ /-]/)[0]}
      ]
    };
  }
};
