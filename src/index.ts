import { KrasInjector, KrasRequest, KrasResponse, KrasInjectorOptions, KrasConfiguration, KrasInjectorConfig } from 'kras';
import { watch, Watcher, editDirectoryOption, editFileOption } from 'kras/utils';
import { load } from 'yamljs';

export interface SwaggerInjectorConfig extends KrasInjectorConfig {
  directory?: Array<string> | string;
}

export interface DynamicSwaggerInjectorConfig {
  directories: Array<string>;
  files: Array<{
    name: string;
    active: boolean;
  }>;
}

interface SwaggerSpec {
  info: {
    title: string;
    version: string;
  };
  consumes: Array<string>;
  produces: Array<string>;
  swagger: string;
  securityDefinitions: {
    [name: string]: any;
  };
  security: Array<string>;
  paths: {
    [path: string]: {
      [method: string]: {
        operationId: string;
        summary: string;
        responses: {
          [code: string]: {
            description: string;
            example: string;
            schema: any;
          };
        };
      };
    };
  };
  definitions: {
    [name: string]: any;
  };
}

interface SwaggerFileEntry {
  active: boolean;
  spec: SwaggerSpec;
}

interface SwaggerFiles {
  [name: string]: SwaggerFileEntry;
}

export default class SwaggerInjector implements KrasInjector {
  private readonly options: SwaggerInjectorConfig;
  private readonly files: SwaggerFiles = {};
  private readonly watcher: Watcher;

  constructor(options: SwaggerInjectorConfig, config: KrasConfiguration) {
    const directory = options.directory || config.directory;
    this.options = options;
    this.watcher = watch(directory, '**/*.yaml', (ev, fileName) => {
      switch (ev) {
        case 'create':
        case 'update':
          return this.load(fileName);
        case 'delete':
          delete this.files[fileName];
          return;
      }
    });
  }

  private load(fileName: string) {
    const swagger = this.files[fileName] || {
      active: true,
      spec: undefined,
    };

    swagger.spec = load(fileName);
    this.files[fileName] = swagger;
  }

  get active(): boolean {
    return this.options.active;
  }

  set active(value: boolean) {
    this.options.active = value;
  }

  get name(): string {
    return 'swagger-injector';
  }

  getOptions(): KrasInjectorOptions {
    return {
      directories: editDirectoryOption(this.watcher.directories),
      files: editFileOption(this.files),
    };
  }

  setOptions(options: DynamicSwaggerInjectorConfig) {
    for (const file of options.files) {
      const script = this.files[file.name];
      const active = file.active;

      if (script && typeof active === 'boolean') {
        script.active = active;
      }
    }

    this.watcher.directories = options.directories;
  }

  handle(req: KrasRequest): KrasResponse {
    const method = req.method.toLowerCase();
    const path = req.url;

    for (const fileName of Object.keys(this.files)) {
      const file = this.files[fileName];

      if (file.active) {
        const paths = file.spec.paths;
        const spec = paths && paths[path];

        if (spec) {
          const { responses = {} } = spec[method] || {
            responses: {},
          };
          const standard = responses['200'];

          if (!standard) {
            const types = Object.keys(responses);
          } else {
            console.log('now that is far!');
          }
        }
      }
    }
  }
}
