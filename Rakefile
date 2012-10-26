require "bundler"
Bundler.setup

require "jasmine"

load 'jasmine/tasks/jasmine.rake'

task :default => "jasmine:ci"

desc "Build nagger"
task :build do
  require "sprockets"
  environment = Sprockets::Environment.new
  environment.append_path 'src'
  environment["nagger"].write_to("build/nagger.js")
end
