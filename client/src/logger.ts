/*
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import { window, OutputChannel } from 'vscode';
import {IS_LOG, IS_PROFILE} from './flags';
import { performance } from 'perf_hooks';

var outputchannel:OutputChannel = undefined;

export function log(message: string, ...args: any[]) {
  if (IS_LOG) {
    if(!outputchannel)
    {
      outputchannel = window.createOutputChannel("CRMScript");
    }
    
    let length = args ? args.length : 0;
    if (length > 0) {
      var argString = args.join(', ');
      message = message + ', ' + argString;
    }
      
    outputchannel.appendLine(message);
    console.log(message);
  }
};

// check to see if native support for profiling is available.
const NATIVE_PROFILE_SUPPORT =
    typeof window !== 'undefined' && !!performance && !!console.profile;

/**
 * A decorator that can profile a function.
 */
export function profile(
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  if (IS_PROFILE) {
    return performProfile(target, propertyKey, descriptor);
  } else {
    // return as-is
    return descriptor;
  }
}

function performProfile(
    target: any, propertyKey: string,
    descriptor: PropertyDescriptor): PropertyDescriptor {
  let originalCallable = descriptor.value;
  // name must exist
  let name = originalCallable.name;
  if (!name) {
    name = 'anonymous function';
  }
  if (NATIVE_PROFILE_SUPPORT) {
    descriptor.value = function(...args: any[]) {
      console.profile(name);
      let startTime = performance.now();
      let result = originalCallable.call(this || window, ...args);
      let duration = performance.now() - startTime;
      console.log(`${name} took ${duration} ms`);
      console.profileEnd();
      return result;
    };
  } else {
    descriptor.value = function(...args: any[]) {
      log(`Profile start ${name}`);
      let start = Date.now();
      let result = originalCallable.call(this || window, ...args);
      let duration = Date.now() - start;
      log(`Profile end ${name} took ${duration} ms.`);
      return result;
    };
  }
  return descriptor;
}
