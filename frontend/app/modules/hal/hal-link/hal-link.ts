//-- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2018 the OpenProject Foundation (OPF)
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

import {HalResource} from 'core-app/modules/hal/resources/hal-resource';
import {
  HalRequestService,
  HTTPSupportedMethods
} from 'core-app/modules/hal/services/hal-request.service';
import {HalLinkService} from 'core-app/modules/hal/hal-link/hal-link.service';

export interface HalLinkInterface {
  href:string|null;
  method:HTTPSupportedMethods;
  title?:string;
  templated?:boolean;
  payload?:any;
  type?:string;
  identifier?:string;
}

export interface CallableHalLink extends HalLinkInterface {
  data?:Promise<HalResource>;
}

export class HalLink implements HalLinkInterface {
  constructor(public halLinkService:HalLinkService,
              public href:string|null = null,
              public title:string = '',
              public method:HTTPSupportedMethods = 'get',
              public templated:boolean = false,
              public payload?:any,
              public type:string = 'application/json',
              public identifier?:string) {
  }

  /**
   * Fetch the resource.
   */
  public $fetch(...params:any[]):Promise<HalResource> {
    const [data, headers] = params;
    return this.halLinkService.halRequestService
      .request(this.method, this.href as string, data, headers)
      .toPromise();
  }

  /**
   * Prepare the templated link and return a CallableHalLink with the templated parameters set
   *
   * @returns {CallableHalLink}
   */
  public $prepare(templateValues:{ [templateKey:string]:string }) {
    if (!this.templated) {
      throw 'The link ' + this.href + ' is not templated.';
    }

    let href = _.clone(this.href) || '';
    _.each(templateValues, (value:string, key:string) => {
      let regexp = new RegExp('{' + key + '}');
      href = href.replace(regexp, value);
    });

    return this.halLinkService.callable({
      href: href,
      title: this.title,
      method: this.method,
      templated: false,
      payload: this.payload,
      type: this.type,
      identifier: this.identifier
    });
  }

  /**
   * Return a function that fetches the resource.
   *
   * @returns {CallableHalLink}
   */
  public $callable():CallableHalLink {
    const linkFunc:any = (...params:any[]) => this.$fetch(...params);

    _.extend(linkFunc, {
      $link: this,
      href: this.href,
      title: this.title,
      method: this.method,
      templated: this.templated,
      payload: this.payload,
      type: this.type,
      identifier: this.identifier,
    });

    return linkFunc;
  }
}