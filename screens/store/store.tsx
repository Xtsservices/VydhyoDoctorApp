import { createStore } from "redux";


const initialData = {
  currentUserID: null,
  currentUser: null,

};

interface Action {
  type: string;
  payload?: any;
}


function Reducer(state = initialData, action: Action) {
  switch (action.type) {
    case "currentUser":
      return {
        ...state,
        currentUser: action.payload,
       
      };

           case "currentUserID": 
      return { ...state,  currentUserID: action.payload?.userId || null, };

    case "CLEAR_USER":
      return {
        ...state,
        currentUser: null,
        currentUserID: null,
      };

    default:
      return state;
  }
}

// function Reducer(state = initialData, action: Action) {
//   switch (action.type) {
//     case "currentUserID": //patient data
//       return { ...state,  currentUserID: action.payload?.userId || null, };
//     case "SET_CURRENT_USER":
//       return {...state,
//         currentUser: action.payload,}
          
//     default:
//       return state;
//   }
// }

const store = createStore(Reducer);

export default store;