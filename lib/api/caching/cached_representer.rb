#-- encoding: UTF-8

#-- copyright
# OpenProject is a project management system.
# Copyright (C) 2012-2018 the OpenProject Foundation (OPF)
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2017 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See docs/COPYRIGHT.rdoc for more details.
#++

module API
  module Caching
    module CachedRepresenter
      extend ::ActiveSupport::Concern

      included do
        def to_json(*args)
          json_rep = OpenProject::Cache.fetch(json_cache_key) do
            super
          end

          hash_rep = ::JSON::parse(json_rep)

          apply_link_cache_ifs(hash_rep)
          add_uncacheable_links(hash_rep)
          apply_property_cache_ifs(hash_rep)

          ::JSON::dump(hash_rep)
        end

        private

        def apply_link_cache_ifs(hash_rep)
          link_conditions = representable_attrs['links']
                            .link_configs
                            .select { |config, _block| config[:cache_if] }

          link_conditions.each do |(config, _block)|
            condition = config[:cache_if]
            next if instance_exec(&condition)

            name = config[:rel]

            delete_from_hash(hash_rep, '_links', name)
          end
        end

        def apply_property_cache_ifs(hash_rep)
          attrs = representable_attrs
                  .select { |_name, config| config[:cache_if] }

          attrs.each do |name, config|
            condition = config[:cache_if]
            next if instance_exec(&condition)

            hash_name = (config[:as] && instance_exec(&config[:as])) || name

            delete_from_hash(hash_rep, config[:embedded] ? '_embedded' : nil, hash_name)
          end
        end

        def add_uncacheable_links(hash_rep)
          link_conditions = representable_attrs['links']
                            .link_configs
                            .select { |config, _block| config[:uncacheable] }

          link_conditions.each do |config, block|
            name = config[:rel]
            hash_rep['_links'][name] = instance_exec(&block)
          end
        end

        # Overriding Roar::Hypermedia#perpare_link_for
        # to remove the cache_if option which would otherwise
        # be visible in the output
        def prepare_link_for(href, options)
          super(href, options.except(:cache_if))
        end

        def json_cache_key
          self.class.name.to_s.split('::') + ['json', I18n.locale]
        end

        def delete_from_hash(hash, path, key)
          pathed_hash = path ? hash[path] : hash

          pathed_hash.delete(key.to_s) if pathed_hash
        end
      end

      class_methods do
        def link(name, options = {}, &block)
          rel_hash = name.is_a?(Hash) ? name : { rel: name }
          super(rel_hash.merge(options), &block)
        end
      end
    end
  end
end
