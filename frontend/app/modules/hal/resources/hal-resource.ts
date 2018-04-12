//-- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
//++

import {InputState} from "reactivestates";
import {HalLinkInterface} from 'core-app/modules/hal/hal-link/hal-link';
import {Injector} from '@angular/core';
import {States} from 'core-components/states.service';
import {I18nToken} from 'core-app/angular4-transition-utils';
import {initializeHalResource} from 'core-app/modules/hal/helpers/hal-resource-builder';

export class HalResource {
  [attribute:string]:any;
  public _type:string;

  protected readonly states:States = this.injector.get(States);
  protected readonly I18n:op.I18n = this.injector.get(I18nToken);

  constructor(public injector:Injector,
              public source:any = HalResource.getEmptyResource(),
              public $loaded:boolean = true) {
    this.$source = source.$source || source;


  public static get attributeTypes():{[attrName:string]:string} {
    return {};
  }

  public static getEmptyResource(self:{ href:string|null } = {href: null}):any {
    return {_links: {self: self}};
  }

  public $links:any = {};
  public $embedded:any = {};
  public $self:Promise<this>;

  public _name:string;

  public static idFromLink(href:string):string {
    return href.split('/').pop()!;
  }

  public get idFromLink():string {
    if (this.$href) {
      return HalResource.idFromLink(this.$href);
    }

    return '';
  }

  public get $isHal():boolean {
    return true;
  }

  public get $link():HalLinkInterface {
    return this.$links.self.$link;
  }

  public get name():string {
    return this._name || this.$link.title || '';
  }

  public set name(name:string) {
    this._name = name;
  }

  /**
   * Alias for $href.
   * Please use $href instead.
   *
   * @deprecated
   */
  public get href():string|null {
    return this.$link.href;
  }

  public get $href():string|null {
    return this.$link.href;
  }

  /**
   * Return the associated state to this HAL resource, if any.
   */
  public get state():InputState<this>|null {
    return null;
  }

  public $load(force = false):Promise<this> {
    if (!this.state) {
      return this.$loadResource(force);
    }

    const state = this.state;

    if (force) {
      state.clear();
    }

    // If nobody has asked yet for the resource to be $loaded, do it ourselves.
    // Otherwise, we risk returning a promise, that will never be resolved.
    state.putFromPromiseIfPristine(() => this.$loadResource(force));

    return <Promise<this>> state.valuesPromise().then(source => {
      this.$initialize(source);
      this.$loaded = true;
      return this;
    });
  }

  protected $loadResource(force = false):Promise<this> {
    if (!force) {
      if (this.$loaded) {
        return Promise.resolve(this);
      }

      if (!this.$loaded && this.$self) {
        return this.$self;
      }
    }

    // Reset and load this resource
    this.$loaded = false;
    this.$self = this.$links.self({}).then((source:any) => {
      this.$loaded = true;
      this.$initialize(source);
      return this;
    });

    return this.$self;
  }

  /**
   * Update the resource ignoring the cache.
   */
  public $update() {
    return this.$load(true);
  }

  public $plain() {
    return angular.copy(this.$source);
  }

  /**
   * Specify this resource's embedded keys that should be transformed with resources.
   * Use this to restrict, e.g., links that should not be made properties if you have a custom get/setter.
   */
  public $embeddableKeys():string[] {
    const properties = Object.keys(this.$source);
    return _.without(properties, '_links', '_embedded');
  }

  /**
   * Specify this resource's keys that should not be transformed with resources.
   * Use this to restrict, e.g., links that should not be made properties if you have a custom get/setter.
   */
  public $linkableKeys():string[] {
    const properties = Object.keys(this.$links);
    return _.without(properties, 'self');
  }
}