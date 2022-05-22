export interface ILinkedList {
    data: any;
    prev?: ILinkedList,
    next?: ILinkedList
}

class LinkedList implements ILinkedList {
    public data;
    public prev: ILinkedList;
    public next: ILinkedList;
    constructor(data, prev?: ILinkedList , next?: ILinkedList) {
        this.data = data;
        this.prev = prev;
        this.next = next;
    }
}

export default LinkedList;
