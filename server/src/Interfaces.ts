export interface VariableInfo {
	name: string;
	href: string;
}
export interface YmlItem {
	uid?: string;
	commentId?: string;
	id?: string;
	langs?: string[];
	children?: string[];
	name: string;
	nameWithType?: string;
	fullName?: string;
	type?: string;
	href?: string;
	items?: YmlItem[];
	summary?: string;
	so?: {
		intellisense?: string;
	};
	parent?: string;
	syntax?: {
		content: string;
	};
	example?: string;
}

export interface YmlReference {
	uid: string;
	commentId: string;
	isExternal: boolean;
	name: string;
	nameWithType: string;
	fullName: string;
}

export interface YmlFile {
	items: YmlItem[];
	references?: YmlReference[];
}
