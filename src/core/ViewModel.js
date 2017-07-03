import { foreach, type, isPlainObject, noop } from "../func/util";
import { vmComputedErr } from "../error";

// 转换存取器属性
function proxy ( descriptors, target ) {
	foreach ( descriptors, ( descriptor, key, descriptors ) => {
		descriptors [ key ] = {
			enumerable : true,
			configurable : true,
			get : () => {
				// 绑定视图

				return target.valueOf._data [ key ];
			},
			set : ( newVal ) => {
				if ( target.valueOf._data [ key ] !== newVal ) {
					target.valueOf._data [ key ] = newVal;

					// 更新视图

				}
			} 
		}
	} );
	Object.defineProperties( target, descriptors );
}

// 初始化绑定事件
function initMethod ( methods, context ) {
	foreach ( methods, ( method, key ) => {
		context.$method [ key ] = ( ...args ) => {
			method.apply ( context, args );
		};
	} );
}

// 初始化监听属性
function initState ( states, context ) {
	let descriptors = {};

	foreach ( states, ( state, key ) => {
		let watch = noop,
			oldVal;

		// 如果属性带有watch方法
		if ( type ( state ) === "object" && Object.keys ( state ).length === 2 && state.hasOwnProperty ( "value" ) && state.hasOwnProperty ( "watch" ) && type ( state.watch ) === "function" ) {
			watch = state.watch;
			state = state.value;
		}

		descriptors [ key ] = {
			enumerable : true,
			configurable : true,
			get : () => {
				// 绑定视图
				// ...

				return state;
			},
			set : ( newVal ) => {
				if ( state !== newVal ) {
					oldVal = state
					state = newVal;

					watch.call ( context, newVal, oldVal );

					// 更新视图
					// ...
				}
			} 
		};
	} );

	Object.defineProperties( context, descriptors );
}

// 初始化计算属性
function initComputed ( computeds, context ) {
	let descriptors = {};

	foreach ( computeds, function ( computed, key ) {
		let t = type ( computed ),
			state;

		if ( !computed || !t === "function" || !computed.hasOwnProperty ( "get" ) ) {
			throw vmComputedErr ( key, "计算属性必须包含get函数，可直接定义一个函数或对象内包含get函数" );
		}

		descriptors [ key ] = {
			enumerable : true,
			configurable : true,
			get : ( function () {
				state = t === "function" ? computed.call ( context ) : computed.get.call ( context );

				return function () {
					// 绑定视图
					// ...

					return state;
				};
			} ) (),
			set : type ( computed.set ) === "function" ? 
			( newVal ) => {
				if ( state !== newVal ) {
					state = computed.set.call ( context, newVal );

					// 更新视图
					// ...
				}
			} : noop
		};
	} );

	Object.defineProperties( context, descriptors );
}

/**
	ViewModel ( vmData: Object, isRoot: Boolean )

	Return Type:
	void

	Description:
	ViewModel数据监听类
	ice.init方法返回的需被监听的数据都使用此类进行实例化

	URL doc:
	http://icejs.org/######
*/
export default function ViewModel ( vmData, isRoot = true ) {
	this.$method 	= {};
	let state 		= {},
		method 		= {},
		computed 	= {},
		array 		= {};

	// 将vmData内的属性进行分类
	foreach ( vmData, ( value, key ) => {

		// 转换普通方法
		if ( type ( value ) === "function" ) {
			method [ key ] = value;
		}

		// 转换计算属性
		// 深层嵌套内的computed属性对象不会被当做计算属性初始化
		else if ( key === "computed" && type ( value ) === "object" && !isRoot ) {
			foreach ( value, ( v, k ) => {
				computed [ k ] = v;
			} );
		}

		// 转换数组
		else if ( type ( value ) === "array" ) {
			array [ key ] = value;
		}

		// 转换普通数据，当值为包含value和watch时将watch转换为监听属性	
		// 如果是对象则将此对象也转换为ViewModel的实例
		else {
			state [ key ] = type ( value ) === "object" && isPlainObject ( value ) ? new ViewModel ( value, false ) : value;
		}
	} );

	// 初始化监听属性
	initMethod ( method, this );
	initState ( state, this );
	initComputed ( computed, this );
	initArray ( array, this );
}