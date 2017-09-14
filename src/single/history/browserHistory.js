import { envErr } from "../../error";
import event from "../../event/core";
import Structure from "../../core/tmpl/Structure";

export default {
	
	// window.history对象
	entity : window.history,
	
	init () {
    	event.on ( window, "popstate", e => {
    	    const locationGuide = this.getState ();
        	
    		// 更新currentPage结构体对象，如果为空表示页面刚刷新，将nextStructure直接赋值给currentPage
    		Structure.currentPage.update ( locationGuide.structure );
    	   	
    	   	// 根据更新后的页面结构体渲染新视图
    	   	Structure.currentPage.render ( {
            	param : locationGuide.param,
    	       	search : locationGuide.search,
    	       	action : "POP"
            } );
        } );
    	
    	return this;
    },
	
	/**
		replace ( state: Any, url: String )
		
		Return Type:
		void
		
		Description:
		对history.replaceState方法的封装
		
		URL doc:
		http://icejs.org/######
	*/
	replace ( state, url ) {
		if ( this.entity.pushState ) {
			this.entity.replaceState ( null, null, url );
			this.saveState ( window.location.pathname, state );
        }
    	else {
        	throw envErr ( "history API", "浏览器不支持history新特性，您可以选择AUTO模式或HASH_BROWSER模式" );
        }
    },
    
    /**
		push ( state: Any, url: String )
		
		Return Type:
		void
		
		Description:
		对history.pushState方法的封装
		
		URL doc:
		http://icejs.org/######
	*/
	push ( state, url ) {
    	if ( this.entity.pushState ) {
			this.entity.pushState ( null, null, url );
			this.saveState ( window.location.pathname, state );
        }
    	else {
        	throw envErr ( "history API", "浏览器不支持history新特性，您可以选择AUTO模式或HASH_BROWSER模式" );
        }
	},

	////////////////////////////////////
	/// 页面刷新前的状态记录，浏览器前进/后退时将在此记录中获取相关状态信息，根据这些信息刷新页面
	/// 
	states : {},

	/**
		setState ( pathname: String, state: Any )
		
		Return Type:
		void
		
		Description:
		保存状态记录
		
		URL doc:
		http://icejs.org/######
	*/
	saveState ( pathname, state ) {
		this.states [ pathname ] = state;
	},

	/**
		getState ( pathname?: String )
		
		Return Type:
		Object
		
		Description:
		获取对应记录
		
		URL doc:
		http://icejs.org/######
	*/
	getState ( pathname ) {
		return this.states [ pathname || window.location.pathname ];
	},
	
	/**
		buildURL ( path: String, mode: String )
		
		Return Type:
		String
    	构建完成后的新url
		
		Description:
		使用path与当前pathname构建新的pathname
        mode为true时不返回hash的开头“#”
        
    	构建规则与普通跳转的构建相同，当新path以“/”开头时则从原url的根目录开始替换，当新path不以“/”老头时，以原url最后一个“/”开始替换

		URL doc:
		http://icejs.org/######
	*/
	buildURL ( path ) {
    	const pathAnchor = document.createElement ( "a" );
		pathAnchor.href = path;
		
		return pathAnchor.pathname;
	},
  
	/**
	getPathname ()

	Return Type:
	String
	pathname

	Description:
	获取pathname

	URL doc:
	http://icejs.org/######
*/
	getPathname () {
		return window.location.pathname;
	},

	/**
    	getQuery ( path?: String )

    	Return Type:
    	String
    	get请求参数对象

    	Description:
		获取get请求参数

    	URL doc:
    	http://icejs.org/######
    */
	getQuery ( path ) {
		return path && ( path.match ( /\?(.*)$/ ) || [ "" ] ) [ 0 ] || window.location.search;
    }
};