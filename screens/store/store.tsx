import { createStore } from "redux";


const initialData = {
  currentUserID: null,

};

interface Action {
  type: string;
  payload?: any;
}

function Reducer(state = initialData, action: Action) {
  switch (action.type) {
    case "currentUserID": //patient data
      return { ...state, currentUserID: action.payload };
   
          
    default:
      return state;
  }
}

const store = createStore(Reducer);

export default store;