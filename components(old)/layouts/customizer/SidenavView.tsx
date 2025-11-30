'use client';
import { useLayoutContext, type SideNavSizeType } from 'contexts(old)/useLayoutContext';
import { TbCircleCheckFilled } from 'react-icons/tb';

const SidenavView = () => {
  const { sidenav, updateSettings } = useLayoutContext();
  const { size } = sidenav;

  const changeSideNavSize = (newSize: SideNavSizeType) => {
    updateSettings({ sidenav: { ...sidenav, size: newSize } });
  };

  return (
    <div className="p-6">
      <h5 className="font-semibold text-sm mb-3">Sidenav View</h5>
      <div className="grid grid-cols-3 gap-3">
        <div className="card-radio">
          <input
            className="hidden peer"
            type="radio"
            name="data-sidenav-size"
            id="sidenav-view-default"
            value="default"
            checked={size === 'default'}
            onChange={() => changeSideNavSize('default')}
          />
          <label className="form-label" htmlFor="sidenav-view-default">
            <span className="flex h-16 overflow-hidden border border-default-200 rounded-md">
              <span className="block w-8 bg-default-100">
                <span className="mt-1.5 mx-1.5 block space-y-1">
                  <span className="h-1 block rounded-sm mb-2.5 bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                </span>
              </span>
              <span className="flex flex-col flex-auto border-s border-default-200">
                <span className="h-3 bg-default-100">
                  <span className="flex items-center justify-end h-full mr-1.5">
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                  </span>
                </span>
                <span className="flex flex-auto border-t border-default-200 bg-default-50"></span>
              </span>
            </span>
          </label>
          <TbCircleCheckFilled className="peer-checked:block hidden absolute end-2 bottom-8 ms-auto text-xl transition-all text-success fill-success" />
          <div className="mt-1 text-md font-medium text-center text-default-600"> Default </div>
        </div>

        <div className="card-radio">
          <input
            className="hidden peer"
            type="radio"
            name="data-sidenav-size"
            id="sidenav-view-hover"
            value="hover"
            checked={size === 'hover'}
            onChange={() => changeSideNavSize('hover')}
          />
          <label className="form-label" htmlFor="sidenav-view-hover">
            <span className="flex h-16 overflow-hidden border border-default-200 rounded-md">
              <span className="w-3 bg-default-100">
                <span className="w-1.5 h-1.5 mt-1 mx-auto rounded-sm bg-default-300"></span>
                <span className="flex flex-col items-center w-full mt-1.5 space-y-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                </span>
              </span>
              <span className="flex flex-col flex-auto border-s border-default-200">
                <span className="h-3 bg-default-100">
                  <span className="flex items-center justify-end h-full mr-1.5">
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                  </span>
                </span>
                <span className="flex flex-auto border-t border-default-200 bg-default-50"></span>
              </span>
            </span>
          </label>
          <TbCircleCheckFilled className="peer-checked:block hidden absolute end-2 bottom-8 ms-auto text-xl transition-all text-success fill-success" />
          <div className="mt-1 text-md font-medium text-center text-default-600"> Hover </div>
        </div>

        <div className="card-radio">
          <input
            className="hidden peer"
            type="radio"
            name="data-sidenav-size"
            id="sidenav-view-hover-active"
            value="hover-active"
            checked={size === 'hover-active'}
            onChange={() => changeSideNavSize('hover-active')}
          />
          <label className="form-label" htmlFor="sidenav-view-hover-active">
            <span className="flex h-16 overflow-hidden border border-default-200 rounded-md">
              <span className="w-8 bg-default-100">
                <span className="mt-1.5 mx-1.5 block space-y-1">
                  <span className="flex mb-2.5 gap-1">
                    <span className="h-1 block w-full rounded-sm bg-default-300"></span>
                    <span className="h-1 block w-2 rounded-full bg-default-300"></span>
                  </span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                  <span className="h-1 block rounded-sm bg-default-300"></span>
                </span>
              </span>
              <span className="flex flex-col flex-auto border-s border-default-200">
                <span className="h-3 bg-default-100">
                  <span className="flex items-center justify-end h-full mr-1.5">
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                  </span>
                </span>
                <span className="flex flex-auto border-t border-default-200 bg-default-50"></span>
              </span>
            </span>
          </label>
          <TbCircleCheckFilled className="peer-checked:block hidden absolute end-2 bottom-8 ms-auto text-xl transition-all text-success fill-success" />
          <div className="mt-1 text-md font-medium text-center text-default-600">
            {' '}
            Hover Active{' '}
          </div>
        </div>

        <div className="card-radio">
          <input
            className="hidden peer"
            type="radio"
            name="data-sidenav-size"
            id="sidenav-view-sm"
            value="sm"
            checked={size === 'sm'}
            onChange={() => changeSideNavSize('sm')}
          />
          <label className="form-label" htmlFor="sidenav-view-sm">
            <span className="flex h-16 overflow-hidden border border-default-200 rounded-md">
              <span className="w-3 bg-default-100">
                <span className="w-1.5 h-1.5 mt-1 mx-auto rounded-sm bg-default-300"></span>
                <span className="flex flex-col items-center w-full mt-1.5 space-y-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-default-300"></span>
                </span>
              </span>
              <span className="flex flex-col flex-auto border-s border-default-200">
                <span className="h-3 bg-default-100">
                  <span className="flex items-center h-full mr-1.5">
                    <span className="grow">
                      <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    </span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                  </span>
                </span>
                <span className="flex flex-auto border-t border-default-200 bg-default-50"></span>
              </span>
            </span>
          </label>
          <TbCircleCheckFilled className="peer-checked:block hidden absolute end-2 bottom-8 ms-auto text-xl transition-all text-success fill-success" />
          <div className="mt-1 text-md font-medium text-center text-default-600"> Small </div>
        </div>

        <div className="card-radio">
          <input
            className="hidden peer"
            type="radio"
            name="data-sidenav-size"
            id="sidenav-view-md"
            value="md"
            checked={size === 'md'}
            onChange={() => changeSideNavSize('md')}
          />
          <label className="form-label" htmlFor="sidenav-view-md">
            <span className="flex h-16 overflow-hidden border border-default-200 rounded-md">
              <span className="w-4 bg-default-100">
                <span className="w-2 h-2 mt-2 mx-auto rounded-sm bg-default-300"></span>
                <span className="flex flex-col items-center w-full mt-2 space-y-1">
                  <span className="w-2 h-2 rounded-sm bg-default-300"></span>
                  <span className="w-2 h-2 rounded-sm bg-default-300"></span>
                  <span className="w-2 h-2 rounded-sm bg-default-300"></span>
                </span>
              </span>
              <span className="flex flex-col flex-auto border-s border-default-200">
                <span className="h-3 bg-default-100">
                  <span className="flex items-center h-full mr-1.5">
                    <span className="grow">
                      <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    </span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ml-1 rounded-full bg-default-300"></span>
                  </span>
                </span>
                <span className="flex flex-auto border-t border-default-200 bg-default-50"></span>
              </span>
            </span>
          </label>
          <TbCircleCheckFilled className="peer-checked:block hidden absolute end-2 bottom-8 ms-auto text-xl transition-all text-success fill-success" />
          <div className="mt-1 text-md font-medium text-center text-default-600"> Compact </div>
        </div>

        <div className="card-radio">
          <input
            className="hidden peer"
            type="radio"
            name="data-sidenav-size"
            id="sidenav-view-mobile"
            value="offcanvas"
            checked={size === 'offcanvas'}
            onChange={() => changeSideNavSize('offcanvas')}
          />
          <label className="form-label" htmlFor="sidenav-view-mobile">
            <span className="flex h-16 overflow-hidden border border-default-200 rounded-md">
              <span className="flex flex-col flex-auto">
                <span className="h-3 bg-default-100">
                  <span className="flex items-center h-full mr-1.5">
                    <span className="w-1.5 h-1.5  ms-1 rounded-sm bg-default-300"></span>
                    <span className="w-1 h-1 block ms-1  rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-auto rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-1 rounded-full bg-default-300"></span>
                  </span>
                </span>
                <span className="flex flex-auto border-t border-default-200 bg-default-50"></span>
              </span>
            </span>
          </label>
          <TbCircleCheckFilled className="peer-checked:block hidden absolute end-2 bottom-8 ms-auto text-xl transition-all text-success fill-success" />
          <div className="mt-1 text-md font-medium text-center text-default-600"> Mobile </div>
        </div>

        <div className="card-radio">
          <input
            className="hidden peer"
            type="radio"
            name="data-sidenav-size"
            id="sidenav-view-hidden"
            value="hidden"
            checked={size === 'hidden'}
            onChange={() => changeSideNavSize('hidden')}
          />
          <label className="form-label" htmlFor="sidenav-view-hidden">
            <span className="flex h-16 overflow-hidden border border-default-200 rounded-md">
              <span className="flex flex-col flex-auto">
                <span className="h-3 bg-default-100">
                  <span className="flex flex-auto items-center h-full me-1.5">
                    <span className="w-1 h-1 block ms-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-auto rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-1 rounded-full bg-default-300"></span>
                    <span className="w-1 h-1 block ms-1 rounded-full bg-default-300"></span>
                  </span>
                </span>
                <span className="flex flex-auto border-t border-default-200 bg-default-50"></span>
              </span>
            </span>
          </label>
          <TbCircleCheckFilled className="peer-checked:block hidden absolute end-2 bottom-8 ms-auto text-xl transition-all text-success fill-success" />
          <div className="mt-1 text-md font-medium text-center text-default-600"> Hidden </div>
        </div>
      </div>
    </div>
  );
};
export default SidenavView;
