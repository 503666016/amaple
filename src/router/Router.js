import { extend, foreach, type, isEmpty } from "../func/util";
import check from "../check";
import { RouterErr } from "../error";
import Structure from "./Structure";


export default function Router ( finger ) {
	this.finger = finger;
}

extend ( Router.prototype, {

    /**
        module ()
    
        Return Type:
        Object
        当前Router对象
    
        Description:
        指定当前配置的模块节点
    
        URL doc:
        http://amaple.org/######
    */
	module ( moduleName = "default" ) {
    	check ( moduleName ).type ( "string" ).notBe ( "" ).ifNot ( "Router.module", "模块名必须为不为空的字符串，不传入模块名默认为'default'" ).do ();
    	
    	foreach ( this.finger, routeItem => {
        	if ( routeItem.name === moduleName ) {
            	throw RouterErr ( "moduleName", "同级模块的名字不能重复" );
            }
        } );
    	
    	this.routeItem = { name : moduleName, routes : [] };
    	this.finger.push ( this.routeItem );
    	
    	return this;
    },
	
    /**
        route ()
    
        Return Type:
        Object
        当前Router对象
    
        Description:
        为一个模块节点配置渲染模块路径
    
        URL doc:
        http://amaple.org/######
    */
	route ( pathExpr, modulePath, childDefineFn ) {
        check ( pathExpr ).type ( "string", "array" ).ifNot ( "Router.route", "pathExpr参数必须为字符串或数组" );

    	if ( !this.routeItem ) {
        	throw RouterErr ( "Router.module", "调用route()前必须先调用module()定义模块路由" );
        }
    	
        let route = {
            modulePath : modulePath,
            path : Router.pathToRegexp ( pathExpr )
        };
    	this.routeItem.routes.push ( route );
        
        if ( type ( childDefineFn ) === "function" ) {
        	route.children = [];
    		childDefineFn ( new Router ( route.children ) );
        }
    	
    	return this;
    },
	
    /**
        defaultRoute ()
    
        Return Type:
        Object
        当前Router对象
    
        Description:
        为一个模块节点配置路由路径为""时的渲染模块路径
    
        URL doc:
        http://amaple.org/######
    */
	defaultRoute ( modulePath, childDefineFn ) {
    	this.route ( "", modulePath, childDefineFn );
    	return this;
    },
	
    /**
        redirect ()
    
        Return Type:
        Object
        当前Router对象
    
        Description:
        在当前模块目录层次定义重定向
    
        URL doc:
        http://amaple.org/######
    */
	redirect ( from, to ) {
    	let redirect;
    	foreach ( this.finger, routeItem => {
        	if ( routeItem.redirect ) {
            	redirect = routeItem;
            	return false;
            }
        } );
    	
    	if ( !redirect ) {
            redirect = {
                redirect : []
            };

            this.finger.push ( redirect );
        }

    	redirect.redirect.push ( { from: Router.pathToRegexp ( from, "redirect" ), to } );
    	
    	return this;
	},
	
    /**
        forcedRender ()
    
        Return Type:
        Object
        当前Router对象
    
        Description:
        强制渲染模块
        调用此函数后，部分匹配相同路由的模块也会强制重新渲染
    
        URL doc:
        http://amaple.org/######
    */
	forcedRender () {
    	this.routeItem.forcedRender = null;
    	return this;
    },

    /**
        error404 ( path404: String )
    
        Return Type:
        void
    
        Description:
        设置404页面路径
        页面跳转时如果有任何一个模块未找到对应模块文件则会重定向到404路径并重新匹配路由来更新模块。
    
        URL doc:
        http://amaple.org/######
    */
    error404 ( path404 ) {
        Router.errorPaths.error404 = path404;
    },

    /**
        error500 ( path500: String )
    
        Return Type:
        void
    
        Description:
        设置错误500页面路径
        页面跳转时如果有任何一个模块处理出现500错误，则会匹配500路径进行跳转
    
        URL doc:
        http://amaple.org/######
    */
    error500 ( path500 ) {
        Router.errorPaths.error500 = path500;
    }
} );

extend ( Router, {
	routeTree : [],
    errorPaths: {},

    /**
        getError ( errorCode: Number )
    
        Return Type:
        Object
        错误路径
    
        Description:
        获取错误路径
    
        URL doc:
        http://amaple.org/######
    */
    getError ( errorCode ) {
        return this.errorPaths [ `error${ errorCode }` ];
    },

    /**
        pathToRegexp ()
    
        Return Type:
        Object
        解析后的路径正则表达式与需捕获的参数对象
    
        Description:
        将一个路径解析为路径匹配正则表达式及需捕获的参数
        正则表达式解析示例：
        // /settings => /\/settings/、/settings/:page => /\/settings/([^\\/]+?)/、/settings/:page(\d+)
    
        URL doc:
        http://amaple.org/######
    */
    pathToRegexp ( pathExpr, from ) {
        const 
            pathObj = { param : {} },
            texpr = type ( pathExpr );
        let i = 1,
			
            // 如果path为redirect中的from，则直接添加结束符号
            // ”/doc“可重定向到”/doc/first“，但”/doc/zero“不能重定向，否则可能重定向为”/doc/first/zero“而导致错误
            endRegexp = "(?:\\/)?" + ( from === "redirect" ? "$" : "" );

        // 如果pathExpr为数组，则需预处理
        if ( texpr === "array" ) {

            // 如果路径表达式为""时需在结尾增加"$"符号才能正常匹配到
            foreach ( pathExpr, ( exprItem, i ) => {
                exprItem = exprItem.substr ( -1 ) === "/" ? exprItem.substr ( 0, exprItem.length - 1 ) : exprItem;
                if ( exprItem === "" && from !== "redirect" ) {
                    pathExpr [ i ] += "$";
                }
            } );
            
            pathExpr = `(${ pathExpr.join ( "|" ) })`;
            i ++;
        }
        else if ( texpr === "string" ) {
            pathExpr = pathExpr.substr ( -1 ) === "/" ? pathExpr.substr ( 0, pathExpr.length - 1 ) : pathExpr;

            // 如果路径表达式为""时需在结尾增加"$"符号才能正常匹配到
            endRegexp += ( pathExpr === "" && from !== "redirect" ? "$" : "" );
        }

        pathObj.regexp = new RegExp ( "^" + pathExpr.replace ( "/", "\\/" ).replace ( /:([\w$]+)(?:(\(.*?\)))?/g, ( match, rep1, rep2 ) => {
            pathObj.param [ rep1 ] = i++;

            return rep2 || "([^\\/]+)";
        } ) + endRegexp, "i" );

        return pathObj;
    },

    /**
        matchRoutes ()
    
        Return Type:
        Object
        匹配结果集
    
        Description:
        使用一个path匹配更新模块
        匹配结果示例：
        [ { module: "...", modulePath: "...", parent: ..., param: {}, children: [ {...}, {...} ] } ]
    
        URL doc:
        http://amaple.org/######
    */
	matchRoutes ( path, extra, routeTree = this.routeTree, parent = null, matchError404 ) {
        if ( parent === null ) {

            // 初始化
            extra.param = {};
            extra.path = path;
        }

        let routes = [];
    	foreach ( routeTree, route => {
        	if ( route.hasOwnProperty ( "redirect" ) ) {
                let isContinue = true,
                    pathBackup = path;
                
                foreach ( route.redirect, redirect => {
                	
                	path = path.replace ( redirect.from.regexp, ( ...match ) => {
                		isContinue = false;
                		let to = redirect.to;
                		
                		foreach ( redirect.from.param, ( i, paramName ) => {
                        	to = to.replace ( `:${ paramName }`, matchPath [ i ] );
                        } );
          				
          				return to;
                	} );

                    // 更新extra.path
                    if ( pathBackup ) {
                        extra.path = extra.path.replace ( pathBackup, path );
                    }
                    else {
                        extra.path += ( ( extra.path.substr ( -1 ) === "/" ? "" : "/" ) + path );
                    }
      				
      				return isContinue;
                } );
  				
  				return false;
        	}
        } );

        foreach ( routeTree, route => {

            // 过滤重定向的项
            if ( !route.name ) {
                return;
            }

            const entityItem = {
                name : route.name,
                modulePath : null,
                moduleNode : null,
                module : null,
                parent
            };
            let isMatch = false;

            foreach ( route.routes, pathReg => {
            	let matchPath, 
                    modulePath = pathReg.modulePath,
                    isContinue = true;
            	
            	if ( route.hasOwnProperty ( "forcedRender" ) ) {
                	entityItem.forcedRender = route.forcedRender;
                }

                if ( matchPath = path.match ( pathReg.path.regexp ) ) {
                	isContinue = false;
                    isMatch = true;

                    extra.param [ route.name ] = { data : {} };
                    foreach ( pathReg.path.param, ( i, paramName ) => {
                        const data = matchPath [ i ] || "";
                        modulePath = modulePath.replace ( new RegExp ( `:${ paramName }`, "g" ), data );

                        extra.param [ route.name ].data [ paramName ] = data;
                    } );
                    entityItem.modulePath = modulePath;

                    routes.push ( entityItem );
                }
            	
            	if ( type ( pathReg.children ) === "array" ) {
                    const 
                        _extra = { param: {}, path: extra.path },
                        children = this.matchRoutes ( matchPath ? path.replace ( matchPath [ 0 ], "" ) : path, _extra, pathReg.children, entityItem );
                        extra.path = _extra.path;
                	
                    // 如果父路由没有匹配到，但子路由有匹配到也需将父路由添加到匹配项中
                	if ( !isEmpty ( children ) ) {
                    	if ( entityItem.modulePath === null ) {
                            isMatch = true;
                            
                            entityItem.modulePath = pathReg.modulePath;
                    		routes.push ( entityItem );
                            extra.param [ route.name ] = { data: {} };
                        }

                        entityItem.children = children;
                        extra.param [ route.name ].children = _extra.param;
                    }
                }
            	
            	return isContinue;
            } );

            // 如果没有匹配到任何路由但父模块有匹配到则需添加一个空模块信息到匹配路由中
            if ( !isMatch && ( parent === null || parent.modulePath !== null ) ) {
                routes.push ( entityItem );
            }

        } );
    
		// 最顶层时返回一个Structure对象
		if ( parent === null ) {

            // 如果没有匹配到任何更新模块则匹配404页面路径
            if ( isEmpty ( routes ) && Router.errorPaths.error404 && !matchError404 ) {
                return this.matchRoutes ( Router.errorPaths.error404, param, undefined, undefined, true );
            }
            else {
                return new Structure ( routes );
            }
        }
		else {
    		return routes;
        }
    }
} );