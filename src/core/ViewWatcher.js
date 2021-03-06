import { extend, type, foreach, noop } from "../func/util";
import { runtimeErr } from "../error";
import slice from "../var/slice";
import Subscriber from "./Subscriber";
import directivePrefix from "../compiler/tmpl/directivePrefix";
import NodeTransaction from "./vnode/NodeTransaction";


/**
	makeFn ( code: String )

	Return Type:
	Function
    代码解析后的方法体

	Description:
	通过解析代码获取的对应vm属性值的方法

	URL doc:
	http://amaple.org/######
*/
export function makeFn ( code ) {
	const fn = new Function ( "vm", "runtimeErr", 
	`var __this = this, ret;
	with ( vm ) {
		try {
			ret = ${ code };
		}
		catch ( e ) {
			throw runtimeErr ( "vm", e );
		}
	}
	return ret;` );

	return function ( vm ) {
		return fn.call ( this || {}, vm, runtimeErr );
	};
}

/**
	ViewWatcher ( directive: Object, node: DOMObject, expr: String, scoped?: Object, tmpl?: Object )

	Return Type:
	void

	Description:
	视图监听类
	模板中所有需绑定的视图都将依次转换为ViewWacther类的对象
	当数据发生变化时，这些对象负责更新视图

	URL doc:
	http://amaple.org/######
*/
export default function ViewWatcher ( directive, node, expr, scoped, tmpl ) {

	this.directive = directive;
	this.node = node;
	this.expr = expr;
	this.tmpl = tmpl;
	this.scoped = scoped;
	
	( directive.before || noop ).call ( this );

	// 如果scoped为局部数据对象则将expr内的局部变量名替换为局部变量名
	if ( scoped && scoped.regexp instanceof RegExp ) {
		this.expr = this.expr.replace ( scoped.regexp, match => scoped.prefix + match );
	}
	
	// 移除相关属性指令表达式
	// 当属性指令表达式与指令名称不同的时候可将对应表达式赋值给this.attrExpr
	if ( node.nodeType === 1 ) {
		node.attr ( directivePrefix + ( this.attrExpr || directive.name ), null );
	}
	
	let val = this.expr;

	// 当该指令为静态指令时，将不会去对应的vm中获取值，相应的也不会被监听
	if ( directive.static !== true ) {
		this.getter = makeFn ( this.expr );
    	
    	// 将获取表达式的真实值并将此watcher对象绑定到依赖监听属性中
		Subscriber.watcher = this;
		val = this.getter ( this.tmpl.vm );

		// 局部变量没有设置监听，所以不会调用Subscriber.subscriber()，需手动设置为undefined
		delete Subscriber.watcher;
    }
  
	directive.update.call ( this, val );
}

extend ( ViewWatcher.prototype, {

	/**
		update ()
	
		Return Type:
		void
	
		Description:
		更新视图
		通过更新虚拟dom再对比计算出更新差异
		最后更新视图
	
		URL doc:
		http://amaple.org/######
	*/
	update () {
		this.tmpl.addScoped ( this.scoped && this.scoped.scopedMounts );

    	// 当已开启了一个事物时将收集新旧节点等待变更
    	// 当没有开启事物时直接处理更新操作
    	if ( NodeTransaction.acting instanceof NodeTransaction ) {
    		NodeTransaction.acting.collect ( this.tmpl.moduleNode );
    		this.directive.update.call ( this, this.getter ( this.tmpl.vm ) );
    	}
    	else {
    		const diffBackup = this.tmpl.moduleNode.clone ();
    		this.directive.update.call ( this, this.getter ( this.tmpl.vm ) );
    		this.tmpl.moduleNode.diff ( diffBackup ).patch ();
    	}

    	this.tmpl.removeScoped ( this.scoped && this.scoped.scopedUnmounts );
    },

    /**
    	unmount ( subscribe: Object )
    
    	Return Type:
    
    	Description:
    	卸载此watcher对象
    	当被绑定元素在DOM树上移除后，对应vm属性对此元素的订阅也需移除
    
    	URL doc:
    	http://amaple.org/######
    */
    unmount ( subscribe ) {
    	const index = subscribe.watchers.indexOf ( this );
    	if ( index > -1 ) {
    		subscribe.watchers.splice ( index, 1 );
    	}
    }
} );